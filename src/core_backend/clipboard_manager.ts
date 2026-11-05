import {
    BasicInstrument,
    BasicPreset,
    BasicSample,
    BasicSoundBank,
    type MIDIPatch,
    MIDIPatchTools,
    Modulator,
    SoundBankCloner
} from "spessasynth_core";
import { CreateSampleAction } from "../menu_list/create_actions/create_sample_action.ts";
import { CreateInstrumentAction } from "../menu_list/create_actions/create_instrument_action.ts";
import { CreatePresetAction } from "../menu_list/create_actions/create_preset_action.ts";
import type { BankDocument } from "./bank_document.ts";
import type { BankSession } from "./bank_session.ts";
import { findFreePatch, getTakenPatches } from "./free_patch.ts";
import type { SampleCopyRef } from "../synth_host/protocol.ts";
import { getObjectId } from "../utils/object_id.ts";
import type { CellCopy } from "../generator_table/cell/cell_clipboard.ts";

/**
 * How many items of each kind the clipboard holds. A new object is created on every copy.
 */
export interface ClipboardContents {
    readonly presets: number;
    readonly instruments: number;
    readonly samples: number;
    readonly modulators: number;
}

/**
 * Which children copied elements share instead of copying them. A shared child is the
 * element itself, already in the bank. Without sharing, every child is copied.
 */
interface ChildSharing {
    instrument: (source: BasicInstrument) => BasicInstrument | undefined;
    sample: (source: BasicSample) => BasicSample | undefined;
}

/**
 * What one clone session made: the elements to add, in the order they can be added in.
 */
interface CreatedElements {
    readonly samples: readonly BasicSample[];
    readonly instruments: readonly BasicInstrument[];
    readonly presets: readonly BasicPreset[];
}

/**
 * An element and its copy. Each side is checked, so a pair of different kinds is skipped.
 */
type ElementPair = readonly [
    BasicPreset | BasicInstrument | BasicSample,
    BasicPreset | BasicInstrument | BasicSample
];

/**
 * Wraps what the cloner made in create actions, children first so every zone's child is in the
 * bank before the zone's element is.
 */
function getCreateActions({ samples, instruments, presets }: CreatedElements) {
    return [
        ...samples.map((s) => new CreateSampleAction(s)),
        ...instruments.map((i) => new CreateInstrumentAction(i)),
        ...presets.map((p) => new CreatePresetAction(p))
    ];
}

/**
 * Pairs each instrument and sample the clone session made with the element it copied, walking
 * the sources. Shared children and the copies `shareChildren` left out are not in `created`,
 * so they are skipped.
 */
function getCopies(
    cloner: SoundBankCloner,
    created: CreatedElements,
    pairs: Iterable<ElementPair>
) {
    const createdSamples = new Set(created.samples);
    const createdInstruments = new Set(created.instruments);
    const samples = new Map<BasicSample, BasicSample>();
    const instruments = new Map<BasicInstrument, BasicInstrument>();
    const addSample = (source: BasicSample) => {
        const copy = cloner.getClone(source);
        if (!copy || !createdSamples.has(copy) || samples.has(copy)) {
            return;
        }
        samples.set(copy, source);
        if (source.linkedSample) {
            addSample(source.linkedSample);
        }
    };
    const addInstrument = (source: BasicInstrument) => {
        const copy = cloner.getClone(source);
        if (!copy || !createdInstruments.has(copy) || instruments.has(copy)) {
            return;
        }
        instruments.set(copy, source);
        for (const zone of source.zones) {
            addSample(zone.sample);
        }
    };
    for (const [source] of pairs) {
        if (source instanceof BasicPreset) {
            for (const zone of source.zones) {
                addInstrument(zone.instrument);
            }
        } else if (source instanceof BasicInstrument) {
            addInstrument(source);
        } else {
            addSample(source);
        }
    }
    return { samples, instruments };
}

/**
 * Points the copies' zones at the children they share and leaves out the copies of those
 * children. A paste into the bank it was copied from shares the children the clipboard's
 * copies came from, which only the clipboard's ids know (core's cloner only shares children
 * that are in the target bank themselves). So everything is copied and the shared children are
 * put back here.
 */
function shareChildren(
    created: CreatedElements,
    pairs: Iterable<ElementPair>,
    sharing: ChildSharing
) {
    const createdSamples = new Set(created.samples);
    const kept = new Set<BasicInstrument | BasicSample>();
    const keepSample = (copy: BasicSample) => {
        if (!createdSamples.has(copy) || kept.has(copy)) {
            return;
        }
        kept.add(copy);
        // A copied half always comes with its partner
        if (copy.linkedSample) {
            keepSample(copy.linkedSample);
        }
    };
    const keepInstrument = (source: BasicInstrument, copy: BasicInstrument) => {
        if (kept.has(copy)) {
            return;
        }
        kept.add(copy);
        for (const [i, zone] of source.zones.entries()) {
            const shared = sharing.sample(zone.sample);
            if (shared) {
                copy.zones[i].sample = shared;
            } else {
                keepSample(copy.zones[i].sample);
            }
        }
    };
    for (const [source, copy] of pairs) {
        if (source instanceof BasicPreset && copy instanceof BasicPreset) {
            for (const [i, zone] of source.zones.entries()) {
                const shared = sharing.instrument(zone.instrument);
                if (shared) {
                    copy.zones[i].instrument = shared;
                } else {
                    keepInstrument(zone.instrument, copy.zones[i].instrument);
                }
            }
        } else if (
            source instanceof BasicInstrument &&
            copy instanceof BasicInstrument
        ) {
            keepInstrument(source, copy);
        } else if (
            source instanceof BasicSample &&
            copy instanceof BasicSample
        ) {
            keepSample(copy);
        }
    }
    return {
        samples: created.samples.filter((s) => kept.has(s)),
        instruments: created.instruments.filter((i) => kept.has(i)),
        presets: created.presets
    };
}

/**
 * The patch each preset gets in the document, its own when free, or the next free one.
 */
function planPatches(document: BankDocument, presets: Iterable<BasicPreset>) {
    const taken = getTakenPatches(document.presets);
    const targets = new Array<{ preset: BasicPreset; patch: MIDIPatch }>();
    for (const preset of presets) {
        const patch = findFreePatch(preset, taken);
        if (!patch) {
            throw new Error(`No free space to paste ${preset.toMIDIString()}`);
        }
        taken.add(MIDIPatchTools.toMIDIString(patch));
        targets.push({ preset, patch });
    }
    return targets;
}

/**
 * The elements one paste, duplicate or drop copies.
 */
interface ClonedElements {
    presets?: Iterable<BasicPreset>;
    instruments?: Iterable<BasicInstrument>;
    samples?: Iterable<BasicSample>;
}

/**
 * The ids of the elements the copies were made from.
 */
function getOriginIds<T extends object>(copies: ReadonlyMap<T, T>) {
    return new Map(
        Array.from(copies, ([copy, original]) => [copy, getObjectId(original)])
    );
}

/**
 * Copied elements and modulators, shared by all tabs.
 * Observable with `subscribe` and `getSnapshot` for `useSyncExternalStore`.
 */
export class ClipboardManager {
    private modulatorClipboard = new Array<Modulator>();
    private cellClipboard: CellCopy | undefined;
    private sampleClipboard = new Set<BasicSample>();
    private instrumentClipboard = new Set<BasicInstrument>();
    private presetClipboard = new Set<BasicPreset>();
    /**
     * The id of the session the elements were copied from. Only the id, so a closed tab is not
     * kept alive by the clipboard.
     */
    private sourceId: number | undefined;
    /**
     * The id of the sample each copied sample was copied from, which the host kept the data of.
     */
    private sampleOrigins = new Map<BasicSample, number>();
    /**
     * The id of the instrument each copied instrument was copied from.
     */
    private instrumentOrigins = new Map<BasicInstrument, number>();
    private readonly listeners = new Set<() => void>();
    private contents: ClipboardContents = {
        presets: 0,
        instruments: 0,
        samples: 0,
        modulators: 0
    };

    public readonly subscribe = (listener: () => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    public readonly getSnapshot = () => this.contents;

    private notify() {
        this.contents = {
            presets: this.presetClipboard.size,
            instruments: this.instrumentClipboard.size,
            samples: this.sampleClipboard.size,
            modulators: this.modulatorClipboard.length
        };
        for (const listener of this.listeners) {
            listener();
        }
    }

    /**
     * Copies the elements into a bank of the clipboard's own, and has the host keep their sample
     * data, so edits made after copying (or an undo that removes them) do not change the paste.
     */
    private keepCopies<T extends BasicPreset | BasicInstrument | BasicSample>(
        elements: Iterable<T>,
        source: BankSession,
        clone: (cloner: SoundBankCloner, element: T) => T
    ) {
        const cloner = new SoundBankCloner(new BasicSoundBank(), {
            reuseByName: false,
            reuseChildren: "none",
            addToBank: true
        });
        const pairs = Array.from(elements, (element): [T, T] => [
            element,
            clone(cloner, element)
        ]);
        const copies = getCopies(cloner, cloner.created, pairs);
        this.sampleOrigins = getOriginIds(copies.samples);
        this.instrumentOrigins = getOriginIds(copies.instruments);
        source.copyToClipboard(copies.samples.values());
        this.sourceId = source.id;
        return new Set(pairs.map(([, copy]) => copy));
    }

    /**
     * Where a pasted sample's data comes from: what the host kept of the sample it copies.
     */
    private fromClipboard(original: BasicSample): SampleCopyRef {
        const id = this.sampleOrigins.get(original);
        if (id === undefined) {
            throw new Error(`The clipboard has no data for ${original.name}.`);
        }
        return { from: "clipboard", id };
    }

    /**
     * Pastes the clipboard's own copies, with the sample data the host kept of them. A paste
     * into the bank they came from shares the instruments and samples the originals used, like
     * a duplicate, while they are still in the bank. The others are copied from the clipboard.
     */
    private paste(target: BankSession, elements: ClonedElements) {
        const { document } = target;
        const find = <T extends object>(
            origins: ReadonlyMap<T, number>,
            copy: T,
            get: (id: number) => T | undefined
        ) => {
            const id = origins.get(copy);
            return id === undefined ? undefined : get(id);
        };
        const sharing: ChildSharing | undefined =
            target.id === this.sourceId
                ? {
                      instrument: (copy) =>
                          find(this.instrumentOrigins, copy, (id) =>
                              document.getInstrument(id)
                          ),
                      sample: (copy) =>
                          find(this.sampleOrigins, copy, (id) =>
                              document.getSample(id)
                          )
                  }
                : undefined;
        return this.cloneInto(target, elements, "none", sharing, (original) =>
            this.fromClipboard(original)
        );
    }

    /**
     * Builds the actions that copy elements into the target, with the instruments and samples
     * they use, shared or copied. One cloner copies the whole selection, so an instrument
     * selected with a preset that uses it is copied once. Copies get free names (`Name-1`),
     * except presets, which keep their names and move to the next free MIDI patch.
     */
    private cloneInto(
        target: BankSession,
        elements: ClonedElements,
        reuseChildren: "identity" | "none",
        sharing: ChildSharing | undefined,
        getDataSource: (original: BasicSample) => SampleCopyRef
    ) {
        const { document } = target;
        const cloner = new SoundBankCloner(document.bank, {
            reuseByName: false,
            reuseChildren,
            addToBank: false
        });
        const targets = planPatches(document, elements.presets ?? []);
        const pairs = new Array<ElementPair>();
        for (const { preset: oldPreset, patch } of targets) {
            const newPreset = cloner.clonePreset(oldPreset);
            pairs.push([oldPreset, newPreset]);
            // Presets are told apart by their patch, so the copy needs no new name
            newPreset.name = oldPreset.name;
            newPreset.program = patch.program;
            newPreset.bankMSB = patch.bankMSB;
            newPreset.bankLSB = patch.bankLSB;
        }
        const { instruments = [], samples = [] } = elements;
        for (const instrument of instruments) {
            pairs.push([instrument, cloner.cloneInstrument(instrument)]);
        }
        for (const sample of samples) {
            pairs.push([sample, cloner.cloneSample(sample)]);
        }
        const created = sharing
            ? shareChildren(cloner.created, pairs, sharing)
            : cloner.created;
        const dataSources = new Map<BasicSample, SampleCopyRef>();
        for (const [copy, original] of getCopies(cloner, created, pairs)
            .samples) {
            dataSources.set(copy, getDataSource(original));
        }
        target.copySampleData(dataSources);
        return getCreateActions(created);
    }

    public get presetCount() {
        return this.presetClipboard.size;
    }

    public get instrumentCount() {
        return this.instrumentClipboard.size;
    }

    public get sampleCount() {
        return this.sampleClipboard.size;
    }

    public getModulators() {
        return this.modulatorClipboard.map(Modulator.copyFrom.bind(Modulator));
    }

    public hasSamples() {
        return this.sampleClipboard.size > 0;
    }

    public hasInstruments() {
        return this.instrumentClipboard.size > 0;
    }

    public hasPresets() {
        return this.presetClipboard.size > 0;
    }

    public copyPresets(p: ReadonlySet<BasicPreset>, source: BankSession) {
        this.presetClipboard = this.keepCopies(p, source, (cloner, preset) => {
            const copy = cloner.clonePreset(preset);
            // The clipboard's bank may have renamed it, a pasted preset keeps its name
            copy.name = preset.name;
            return copy;
        });
        this.sampleClipboard = new Set();
        this.instrumentClipboard = new Set();
        this.notify();
    }

    public copyInstruments(
        i: ReadonlySet<BasicInstrument>,
        source: BankSession
    ) {
        this.instrumentClipboard = this.keepCopies(i, source, (cloner, e) =>
            cloner.cloneInstrument(e)
        );
        this.sampleClipboard = new Set();
        this.presetClipboard = new Set();
        this.notify();
    }

    public copySamples(s: ReadonlySet<BasicSample>, source: BankSession) {
        this.sampleClipboard = this.keepCopies(s, source, (cloner, e) =>
            cloner.cloneSample(e)
        );
        this.instrumentClipboard = new Set();
        this.presetClipboard = new Set();
        this.notify();
    }

    /**
     * Generator cell values are plain data, so they paste into any bank. Nothing shows how many
     * there are, so this does not notify.
     */
    public copyCells(cells: CellCopy) {
        this.cellClipboard = cells;
    }

    public get cells() {
        return this.cellClipboard;
    }

    public copyModulators(mods: readonly Modulator[]) {
        this.modulatorClipboard = mods.map(Modulator.copyFrom.bind(Modulator));
        this.notify();
    }

    /**
     * Builds the actions that paste the copied presets with their instruments and samples.
     * Pasted presets move to the next free MIDI patch.
     */
    public pastePresets(target: BankSession) {
        return this.paste(target, { presets: this.presetClipboard });
    }

    /**
     * How many of the presets (the copied ones by default) a paste or drop into the document
     * would move to another patch, because a preset there (or one pasted before it) already
     * uses theirs.
     */
    public countMovedPresets(
        document: BankDocument,
        presets: Iterable<BasicPreset> = this.presetClipboard
    ) {
        return planPatches(document, presets).filter(
            ({ preset, patch }) => !preset.matches(patch)
        ).length;
    }

    /**
     * Builds the actions that paste the copied instruments with their samples.
     */
    public pasteInstruments(target: BankSession) {
        return this.paste(target, { instruments: this.instrumentClipboard });
    }

    /**
     * Builds the actions that paste the copied samples.
     */
    public pasteSamples(target: BankSession) {
        return this.paste(target, { samples: this.sampleClipboard });
    }

    /**
     * Builds the actions that copy elements of a session into the target. A duplicate (the
     * target itself) shares the very instruments and samples the originals use, another bank
     * gets copies of them.
     * @param source the session the elements belong to, the target itself for a duplicate
     */
    public cloneElements(
        target: BankSession,
        elements: ClonedElements,
        source = target
    ) {
        // A duplicate shares the children it uses, which are in the bank already
        return this.cloneInto(
            target,
            elements,
            source === target ? "identity" : "none",
            undefined,
            (original) => ({
                from: "session",
                sessionId: source.id,
                id: getObjectId(original)
            })
        );
    }
}
