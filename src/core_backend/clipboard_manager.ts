import {
    BasicInstrument,
    BasicPreset,
    BasicSample,
    type MIDIPatch,
    MIDIPatchTools,
    Modulator
} from "spessasynth_core";
import { CreateSampleAction } from "../menu_list/create_actions/create_sample_action.ts";
import { CreateInstrumentAction } from "../menu_list/create_actions/create_instrument_action.ts";
import type { HistoryAction } from "./history.ts";
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
 * The samples of one paste: every sample of the target bank (for unique names), and the
 * copies made so far by their original.
 */
interface SampleCloneState {
    all: BasicSample[];
    clones: Map<BasicSample, BasicSample>;
}

function createSampleCloneState(document: BankDocument): SampleCloneState {
    return { all: [...document.samples], clones: new Map() };
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

    /**
     * Clones a sample (and its stereo pair) into new create actions.
     * @param oldSample the sample to clone
     * @param samples the bank's samples plus the ones cloned so far, used for unique names
     * @param actions receives the create actions
     * @param shouldDuplicate when false, an existing sample with the same name is reused instead
     */
    private addSample(
        oldSample: BasicSample,
        samples: SampleCloneState,
        actions: HistoryAction[],
        shouldDuplicate = true
    ): BasicSample {
        const cloned = samples.clones.get(oldSample);
        if (cloned) {
            return cloned;
        }
        const names = new Set(samples.all.map((s) => s.name));
        if (!shouldDuplicate) {
            const existing = samples.all.find((s) => s.name === oldSample.name);
            if (existing) {
                return existing;
            }
        }
        const originalName = oldSample.name.slice(0, 37);
        let name = oldSample.name;
        for (let count = 1; names.has(name); count++) {
            name = `${originalName}-${count}`;
        }
        const newSample = new BasicSample(
            name,
            oldSample.sampleRate,
            oldSample.originalKey,
            oldSample.pitchCorrection,
            oldSample.sampleType,
            oldSample.loopStart,
            oldSample.loopEnd
        );
        if (oldSample.isCompressed) {
            newSample.setCompressedData(oldSample.getRawData(true));
        } else {
            newSample.setAudioData(
                oldSample.getAudioData(),
                oldSample.sampleRate
            );
        }
        actions.push(new CreateSampleAction(newSample));
        samples.all.push(newSample);
        samples.clones.set(oldSample, newSample);
        const linked = oldSample.linkedSample;
        if (linked) {
            // The pair is always cloned together. Reusing a partner that is already in the
            // bank would relink it, outside of undo. The second of the two does the linking.
            const newLinked = samples.clones.get(linked);
            if (newLinked) {
                newSample.setLinkedSample(newLinked, oldSample.sampleType);
            } else {
                this.addSample(linked, samples, actions);
            }
        }
        return newSample;
    }

    private addInstrument(
        oldInst: BasicInstrument,
        alreadyCloned: BasicInstrument[],
        clonedSamples: SampleCloneState,
        actions: HistoryAction[],
        shouldDuplicate = true
    ): BasicInstrument {
        const names = new Set(alreadyCloned.map((i) => i.name));
        const isNameTaken = names.has(oldInst.name);
        let name = oldInst.name;
        const originalName = oldInst.name.slice(0, 37);
        if (isNameTaken) {
            if (!shouldDuplicate) {
                const r = alreadyCloned.find((i) => i.name === oldInst.name);
                if (!r) {
                    throw new Error(
                        "This should never happen. If it did, then congrats!"
                    );
                }
                return r;
            }
            let count = 1;
            while (names.has(name)) {
                name = `${originalName}-${count}`;
                count++;
            }
        }
        const newInst = new BasicInstrument();
        newInst.name = name;
        newInst.globalZone.copyFrom(oldInst.globalZone);
        for (const zone of oldInst.zones) {
            const copiedZone = newInst.createZone(
                this.addSample(zone.sample, clonedSamples, actions, false)
            );
            copiedZone.copyFrom(zone);
        }
        actions.push(new CreateInstrumentAction(newInst));
        alreadyCloned.push(newInst);
        return newInst;
    }

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
     * The copies move to the next free MIDI patch.
     */
    clonePresets(document: BankDocument, presets: Iterable<BasicPreset>) {
        const actions = new Array<HistoryAction>();
        const clonedInstruments = [...document.instruments];
        const clonedSamples = createSampleCloneState(document);
        const presetNumbers = new Set<string>();
        for (const p of document.presets) {
            presetNumbers.add(p.toMIDIString());
        }
        for (const oldPreset of presets) {
            const patch: MIDIPatch = {
                bankMSB: oldPreset.bankMSB,
                bankLSB: oldPreset.bankLSB,
                program: oldPreset.program,
                isGMGSDrum: oldPreset.isGMGSDrum
            };
            let num = 0;
            while (presetNumbers.has(MIDIPatchTools.toMIDIString(patch))) {
                num++;
                patch.program = num % 128;
                patch.bankMSB = Math.max(0, num - 128) % 128;
                patch.bankLSB = Math.max(0, num - 256) % 128;
                if (num > 3 * 128) {
                    throw new Error(
                        `No free space to paste ${oldPreset.toMIDIString()}`
                    );
                }
            }
            const newPreset = new BasicPreset(document.bank);
            newPreset.name = oldPreset.name;
            newPreset.program = patch.program;
            newPreset.bankMSB = patch.bankMSB;
            newPreset.bankLSB = patch.bankLSB;
            newPreset.isGMGSDrum = oldPreset.isGMGSDrum;

            newPreset.library = oldPreset.library;
            newPreset.morphology = oldPreset.morphology;
            newPreset.genre = oldPreset.genre;

            newPreset.globalZone.copyFrom(oldPreset.globalZone);
            for (const zone of oldPreset.zones) {
                const newZone = newPreset.createZone(
                    this.addInstrument(
                        zone.instrument,
                        clonedInstruments,
                        clonedSamples,
                        actions,
                        false
                    )
                );
                newZone.copyFrom(zone);
            }
            actions.push(new CreatePresetAction(newPreset));
            presetNumbers.add(newPreset.toMIDIString());
        }
        return actions;
    }

    /**
     * Builds the actions that copy instruments into the document with their samples.
     * Samples with a name the document already has are reused.
     */
    cloneInstruments(
        document: BankDocument,
        instruments: Iterable<BasicInstrument>
    ) {
        const clonedInstruments = [...document.instruments];
        const clonedSamples = createSampleCloneState(document);
        const actions = new Array<HistoryAction>();
        for (const oldInst of instruments) {
            this.addInstrument(
                oldInst,
                clonedInstruments,
                clonedSamples,
                actions
            );
        }
        return actions;
    }

    /**
     * Builds the actions that copy samples into the document.
     */
    cloneSamples(document: BankDocument, samples: Iterable<BasicSample>) {
        const clonedSamples = createSampleCloneState(document);
        const actions = new Array<HistoryAction>();
        for (const oldSample of samples) {
            this.addSample(oldSample, clonedSamples, actions);
        }
        return actions;
    }
}
