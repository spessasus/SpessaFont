import {
    type BasicInstrument,
    type BasicPreset,
    type BasicSample,
    type MIDIPatch,
    MIDIPatchTools,
    Modulator,
    SoundBankCloner
} from "spessasynth_core";
import { CreateSampleAction } from "../menu_list/create_actions/create_sample_action.ts";
import { CreateInstrumentAction } from "../menu_list/create_actions/create_instrument_action.ts";
import { CreatePresetAction } from "../menu_list/create_actions/create_preset_action.ts";
import type { BankDocument } from "./bank_document.ts";

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

const MIDI_VALUES = 128;

/**
 * The first free patch from the preset's own: the next programs of its bank first, then the
 * next bank numbers (MSB, then LSB). Undefined when every patch is taken.
 */
function findFreePatch(preset: BasicPreset, taken: ReadonlySet<string>) {
    // A drum preset is told apart by its program only
    const bankSteps = preset.isGMGSDrum ? 1 : MIDI_VALUES * MIDI_VALUES;
    for (let bankStep = 0; bankStep < bankSteps; bankStep++) {
        const msb = preset.bankMSB + bankStep;
        const bankMSB = msb % MIDI_VALUES;
        const bankLSB =
            (preset.bankLSB + Math.floor(msb / MIDI_VALUES)) % MIDI_VALUES;
        for (let step = 0; step < MIDI_VALUES; step++) {
            const patch: MIDIPatch = {
                bankMSB,
                bankLSB,
                program: (preset.program + step) % MIDI_VALUES,
                isGMGSDrum: preset.isGMGSDrum
            };
            if (!taken.has(MIDIPatchTools.toMIDIString(patch))) {
                return patch;
            }
        }
    }
    return undefined;
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
    copyPresets(p: ReadonlySet<BasicPreset>) {
        this.presetClipboard = new Set(p);
        this.sampleClipboard = new Set();
        this.instrumentClipboard = new Set();
        this.notify();
    }

    copyInstruments(i: ReadonlySet<BasicInstrument>) {
        this.instrumentClipboard = new Set(i);
        this.sampleClipboard = new Set();
        this.presetClipboard = new Set();
        this.notify();
    }

    copySamples(s: ReadonlySet<BasicSample>) {
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
    pastePresets(document: BankDocument) {
        return this.clonePresets(document, this.presetClipboard);
    }

    /**
     * Builds the actions that paste the copied instruments with their samples.
     */
    pasteInstruments(document: BankDocument) {
        return this.cloneInstruments(document, this.instrumentClipboard);
    }

    /**
     * Builds the actions that paste the copied samples.
     */
    pasteSamples(document: BankDocument) {
        return this.cloneSamples(document, this.sampleClipboard);
    }

    /**
     * Builds the actions that copy presets into the document (the same bank or another one),
     * with their instruments and samples. Instruments and samples with a name the document
     * already has are reused, so a duplicate in the same bank shares them.
     * The copies keep their names and move to the next free MIDI patch.
     */
    clonePresets(document: BankDocument, presets: Iterable<BasicPreset>) {
        const cloner = createCloner(document);
        const taken = new Set<string>();
        for (const p of document.presets) {
            taken.add(p.toMIDIString());
        }
        // Every patch is found before anything is cloned, as cloned zones already link to
        // the instruments they reuse
        const targets = new Array<{ preset: BasicPreset; patch: MIDIPatch }>();
        for (const preset of presets) {
            const patch = findFreePatch(preset, taken);
            if (!patch) {
                throw new Error(
                    `No free space to paste ${preset.toMIDIString()}`
                );
            }
            taken.add(MIDIPatchTools.toMIDIString(patch));
            targets.push({ preset, patch });
        }
        for (const { preset: oldPreset, patch } of targets) {
            const newPreset = cloner.clonePreset(oldPreset);
            // Presets are told apart by their patch, so the copy needs no new name
            newPreset.name = oldPreset.name;
            newPreset.program = patch.program;
            newPreset.bankMSB = patch.bankMSB;
            newPreset.bankLSB = patch.bankLSB;
        }
        return getCreateActions(cloner);
    }

    /**
     * Builds the actions that copy instruments into the document with their samples.
     * Samples with a name the document already has are reused.
     */
    cloneInstruments(
        document: BankDocument,
        instruments: Iterable<BasicInstrument>
    ) {
        const cloner = createCloner(document);
        for (const instrument of instruments) {
            cloner.cloneInstrument(instrument);
        }
        return getCreateActions(cloner);
    }

    /**
     * Builds the actions that copy samples into the document, with their stereo partners.
     */
    cloneSamples(document: BankDocument, samples: Iterable<BasicSample>) {
        const cloner = createCloner(document);
        for (const sample of samples) {
            cloner.cloneSample(sample);
        }
        return getCreateActions(cloner);
    }
}
