import {
    BasicInstrument,
    BasicPreset,
    BasicSample,
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
 * (`Name-1`), while the instruments and samples they use are reused when the document has
 * one with the same name. Nothing is added to the bank, the create actions do that.
 */
function createCloner(document: BankDocument) {
    return new SoundBankCloner(document.bank, {
        reuseByName: false,
        reuseChildrenByName: true,
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
    pairs: Iterable<
        | [BasicPreset, BasicPreset]
        | [BasicInstrument, BasicInstrument]
        | [BasicSample, BasicSample]
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
 * Copied elements and modulators, shared by all tabs.
 * Observable with `subscribe` and `getSnapshot` for `useSyncExternalStore`.
 */
export class ClipboardManager {
    private modulatorClipboard: Modulator[] = [];
    private sampleClipboard = new Set<BasicSample>();
    private instrumentClipboard = new Set<BasicInstrument>();
    private presetClipboard = new Set<BasicPreset>();
    /**
     * The session the copied elements belong to, whose mirror has their sample data.
     */
    private source: BankSession | undefined;
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

    // Copies keep their own sets, so later selection changes do not alter the clipboard
    copyPresets(p: ReadonlySet<BasicPreset>, source: BankSession) {
        this.source = source;
        this.presetClipboard = new Set(p);
        this.sampleClipboard = new Set();
        this.instrumentClipboard = new Set();
        this.notify();
    }

    copyInstruments(i: ReadonlySet<BasicInstrument>, source: BankSession) {
        this.source = source;
        this.instrumentClipboard = new Set(i);
        this.sampleClipboard = new Set();
        this.presetClipboard = new Set();
        this.notify();
    }

    copySamples(s: ReadonlySet<BasicSample>, source: BankSession) {
        this.source = source;
        this.sampleClipboard = new Set(s);
        this.instrumentClipboard = new Set();
        this.presetClipboard = new Set();
        this.notify();
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
        return this.clonePresets(target, this.presetClipboard, this.source);
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
        return this.cloneInstruments(
            target,
            this.instrumentClipboard,
            this.source
        );
    }

    /**
     * Builds the actions that paste the copied samples.
     */
    pasteSamples(target: BankSession) {
        return this.cloneSamples(target, this.sampleClipboard, this.source);
    }

    /**
     * Builds the actions that copy presets into the document (the same bank or another one),
     * with their instruments and samples. Instruments and samples with a name the document
     * already has are reused, so a duplicate in the same bank shares them.
     * The copies keep their names and move to the next free MIDI patch.
     * @param source the session the presets belong to, the target itself for a duplicate
     */
    clonePresets(
        target: BankSession,
        presets: Iterable<BasicPreset>,
        source = target
    ) {
        const { document } = target;
        const cloner = createCloner(document);
        // Every patch is found before anything is cloned, as cloned zones already link to
        // the instruments they reuse
        const targets = planPatches(document, presets);
        const pairs = new Array<[BasicPreset, BasicPreset]>();
        for (const { preset: oldPreset, patch } of targets) {
            const newPreset = cloner.clonePreset(oldPreset);
            pairs.push([oldPreset, newPreset]);
            // Presets are told apart by their patch, so the copy needs no new name
            newPreset.name = oldPreset.name;
            newPreset.program = patch.program;
            newPreset.bankMSB = patch.bankMSB;
            newPreset.bankLSB = patch.bankLSB;
        }
        target.copySampleData(getSampleCopies(cloner, pairs), source);
        return getCreateActions(cloner);
    }

    /**
     * Builds the actions that copy instruments into the document with their samples.
     * Samples with a name the document already has are reused.
     */
    cloneInstruments(
        target: BankSession,
        instruments: Iterable<BasicInstrument>,
        source = target
    ) {
        const cloner = createCloner(target.document);
        const pairs = new Array<[BasicInstrument, BasicInstrument]>();
        for (const instrument of instruments) {
            pairs.push([instrument, cloner.cloneInstrument(instrument)]);
        }
        target.copySampleData(getSampleCopies(cloner, pairs), source);
        return getCreateActions(cloner);
    }

    /**
     * Builds the actions that copy samples into the document, with their stereo partners.
     */
    cloneSamples(
        target: BankSession,
        samples: Iterable<BasicSample>,
        source = target
    ) {
        const cloner = createCloner(target.document);
        const pairs = new Array<[BasicSample, BasicSample]>();
        for (const sample of samples) {
            pairs.push([sample, cloner.cloneSample(sample)]);
        }
        target.copySampleData(getSampleCopies(cloner, pairs), source);
        return getCreateActions(cloner);
    }
}
