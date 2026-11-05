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
 * Starts one paste or duplicate. The copied elements are always new, under a free name
 * (`Name-1`). Nothing is added to the bank, the create actions do that.
 * In the same bank, the instruments and samples they use are shared by name. A paste into
 * another bank copies them, as an element there with the same name is a different one.
 */
function createCloner(document: BankDocument, isSameBank: boolean) {
    return new SoundBankCloner(document.bank, {
        reuseByName: false,
        reuseChildrenByName: isSameBank,
        addToBank: false
    });
}

/**
 * Wraps what the cloner made in create actions, children first so every zone's child is in the
 * bank before the zone's element is.
 */
function getCreateActions(cloner: SoundBankCloner) {
    const { samples, instruments, presets } = cloner.created;
    return [
        ...samples.map((s) => new CreateSampleAction(s)),
        ...instruments.map((i) => new CreateInstrumentAction(i)),
        ...presets.map((p) => new CreatePresetAction(p))
    ];
}

/**
 * Pairs each sample the cloner made with the sample it copied. The cloner keeps that map to
 * itself, but it copies zones in order, so the copied elements line up with their sources.
 */
function getSampleCopies(
    cloner: SoundBankCloner,
    // Each side is checked, so a pair of different kinds is skipped
    pairs: Iterable<
        readonly [
            BasicPreset | BasicInstrument | BasicSample,
            BasicPreset | BasicInstrument | BasicSample
        ]
    >
) {
    const createdSamples = new Set(cloner.created.samples);
    const createdInstruments = new Set(cloner.created.instruments);
    const copies = new Map<BasicSample, BasicSample>();
    const addSample = (source: BasicSample, copy: BasicSample) => {
        if (!createdSamples.has(copy) || copies.has(copy)) {
            return;
        }
        copies.set(copy, source);
        if (source.linkedSample && copy.linkedSample) {
            addSample(source.linkedSample, copy.linkedSample);
        }
    };
    // A reused instrument is the document's own, its zones do not line up with the source's
    const addInstrument = (source: BasicInstrument, copy: BasicInstrument) => {
        if (!createdInstruments.has(copy)) {
            return;
        }
        for (const [i, zone] of source.zones.entries()) {
            addSample(zone.sample, copy.zones[i].sample);
        }
    };
    for (const [source, copy] of pairs) {
        if (source instanceof BasicPreset && copy instanceof BasicPreset) {
            for (const [i, zone] of source.zones.entries()) {
                addInstrument(zone.instrument, copy.zones[i].instrument);
            }
        } else if (
            source instanceof BasicInstrument &&
            copy instanceof BasicInstrument
        ) {
            addInstrument(source, copy);
        } else if (
            source instanceof BasicSample &&
            copy instanceof BasicSample
        ) {
            addSample(source, copy);
        }
    }
    return copies;
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
 * Copied elements and modulators, shared by all tabs.
 * Observable with `subscribe` and `getSnapshot` for `useSyncExternalStore`.
 */
export class ClipboardManager {
    private modulatorClipboard: Modulator[] = [];
    private cellClipboard: CellCopy | undefined;
    private sampleClipboard = new Set<BasicSample>();
    private instrumentClipboard = new Set<BasicInstrument>();
    private presetClipboard = new Set<BasicPreset>();
    /**
     * The session the elements were copied from. A paste into it shares instruments and samples
     * by name, like a duplicate.
     */
    private source: BankSession | undefined;
    /**
     * The id of the sample each copied sample was copied from, which the host kept the data of.
     */
    private sampleOrigins = new Map<BasicSample, number>();
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
            reuseChildrenByName: false,
            addToBank: true
        });
        const pairs = Array.from(elements, (element): [T, T] => [
            element,
            clone(cloner, element)
        ]);
        const copies = getSampleCopies(cloner, pairs);
        this.sampleOrigins = new Map(
            Array.from(copies, ([copy, original]) => [
                copy,
                getObjectId(original)
            ])
        );
        source.copyToClipboard(copies.values());
        this.source = source;
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
     * into the bank they came from shares its instruments and samples by name, like a duplicate.
     */
    private paste(target: BankSession, elements: ClonedElements) {
        return this.cloneElements(
            target,
            elements,
            target === this.source ? target : null,
            (original) => this.fromClipboard(original)
        );
    }

    get presetCount() {
        return this.presetClipboard.size;
    }

    get instrumentCount() {
        return this.instrumentClipboard.size;
    }

    get sampleCount() {
        return this.sampleClipboard.size;
    }

    getModulators() {
        return this.modulatorClipboard.map(Modulator.copyFrom.bind(Modulator));
    }

    hasSamples() {
        return this.sampleClipboard.size > 0;
    }

    hasInstruments() {
        return this.instrumentClipboard.size > 0;
    }

    hasPresets() {
        return this.presetClipboard.size > 0;
    }

    copyPresets(p: ReadonlySet<BasicPreset>, source: BankSession) {
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

    copyInstruments(i: ReadonlySet<BasicInstrument>, source: BankSession) {
        this.instrumentClipboard = this.keepCopies(i, source, (cloner, e) =>
            cloner.cloneInstrument(e)
        );
        this.sampleClipboard = new Set();
        this.presetClipboard = new Set();
        this.notify();
    }

    copySamples(s: ReadonlySet<BasicSample>, source: BankSession) {
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

    copyModulators(mods: readonly Modulator[]) {
        this.modulatorClipboard = mods.map(Modulator.copyFrom.bind(Modulator));
        this.notify();
    }

    /**
     * Builds the actions that paste the copied presets with their instruments and samples.
     * Pasted presets move to the next free MIDI patch.
     */
    pastePresets(target: BankSession) {
        return this.paste(target, { presets: this.presetClipboard });
    }

    /**
     * How many of the copied presets a paste into the document would move to another patch,
     * because a preset there (or one pasted before it) already uses theirs.
     */
    countMovedPresets(document: BankDocument) {
        return planPatches(document, this.presetClipboard).filter(
            ({ preset, patch }) => !preset.matches(patch)
        ).length;
    }

    /**
     * Builds the actions that paste the copied instruments with their samples.
     */
    pasteInstruments(target: BankSession) {
        return this.paste(target, { instruments: this.instrumentClipboard });
    }

    /**
     * Builds the actions that paste the copied samples.
     */
    pasteSamples(target: BankSession) {
        return this.paste(target, { samples: this.sampleClipboard });
    }

    /**
     * Builds the actions that copy elements into the document (the same bank or another one),
     * with the instruments and samples they use. In the same bank those are shared (a duplicate
     * plays the same instruments), in another bank they are copied too. One cloner copies the
     * whole selection, so an instrument selected with a preset that uses it is copied once.
     * Copied presets keep their names and move to the next free MIDI patch.
     * @param source the session the elements belong to, the target itself for a duplicate
     */
    cloneElements(
        target: BankSession,
        elements: ClonedElements,
        // null for copies with no session of their own (the clipboard's)
        source: BankSession | null = target,
        getDataSource = (original: BasicSample): SampleCopyRef => {
            if (!source) {
                throw new Error(
                    "Copied samples need the session they come from."
                );
            }
            return {
                from: "session",
                sessionId: source.id,
                id: getObjectId(original)
            };
        }
    ) {
        const { document } = target;
        const cloner = createCloner(document, source === target);
        // Every patch is found before anything is cloned, as cloned zones already link to
        // the instruments they reuse
        const targets = planPatches(document, elements.presets ?? []);
        const pairs = new Array<
            | [BasicPreset, BasicPreset]
            | [BasicInstrument, BasicInstrument]
            | [BasicSample, BasicSample]
        >();
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
        const dataSources = new Map<BasicSample, SampleCopyRef>();
        for (const [copy, original] of getSampleCopies(cloner, pairs)) {
            dataSources.set(copy, getDataSource(original));
        }
        target.copySampleData(dataSources);
        return getCreateActions(cloner);
    }

    /**
     * `cloneElements` for presets only.
     */
    clonePresets(
        target: BankSession,
        presets: Iterable<BasicPreset>,
        source = target
    ) {
        return this.cloneElements(target, { presets }, source);
    }

    /**
     * `cloneElements` for instruments only.
     */
    cloneInstruments(
        target: BankSession,
        instruments: Iterable<BasicInstrument>,
        source = target
    ) {
        return this.cloneElements(target, { instruments }, source);
    }

    /**
     * `cloneElements` for samples only, with their stereo partners.
     */
    cloneSamples(
        target: BankSession,
        samples: Iterable<BasicSample>,
        source = target
    ) {
        return this.cloneElements(target, { samples }, source);
    }
}
