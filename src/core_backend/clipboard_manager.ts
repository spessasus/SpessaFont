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

export class ClipboardManager {
    private modulatorClipboard: Modulator[] = [];
    private sampleClipboard = new Set<BasicSample>();
    private instrumentClipboard = new Set<BasicInstrument>();
    private presetClipboard = new Set<BasicPreset>();

    /**
     * Clones a sample (and its stereo pair) into new create actions.
     * @param oldSample the sample to clone
     * @param alreadyCloned the bank's samples plus the ones cloned so far, used for unique names
     * @param actions receives the create actions
     * @param shouldDuplicate when false, an existing sample with the same name is reused instead
     */
    private addSample(
        oldSample: BasicSample,
        alreadyCloned: BasicSample[],
        actions: HistoryAction[],
        shouldDuplicate = true
    ): BasicSample {
        const names = new Set(alreadyCloned.map((s) => s.name));
        const isNameTaken = names.has(oldSample.name);
        const originalName = oldSample.name.slice(0, 37);
        let name = oldSample.name;
        if (isNameTaken) {
            if (!shouldDuplicate) {
                const r = alreadyCloned.find((s) => s.name === oldSample.name);
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
        alreadyCloned.push(newSample);
        if (oldSample.linkedSample) {
            const newLinked = this.addSample(
                oldSample.linkedSample,
                alreadyCloned,
                actions,
                false
            );
            // relink cloned samples
            newLinked.unlinkSample();
            newSample.setLinkedSample(newLinked, oldSample.sampleType);
        }
        return newSample;
    }

    private addInstrument(
        oldInst: BasicInstrument,
        alreadyCloned: BasicInstrument[],
        clonedSamples: BasicSample[],
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

    copyPresets(p: Set<BasicPreset>) {
        this.presetClipboard = p;
        this.sampleClipboard.clear();
        this.instrumentClipboard.clear();
    }

    copyInstruments(i: Set<BasicInstrument>) {
        this.instrumentClipboard = i;
        this.sampleClipboard.clear();
        this.presetClipboard.clear();
    }

    copySamples(s: Set<BasicSample>) {
        this.sampleClipboard = s;
        this.instrumentClipboard.clear();
        this.presetClipboard.clear();
    }

    copyModulators(mods: Modulator[]) {
        this.modulatorClipboard = mods.map(Modulator.copyFrom.bind(Modulator));
    }

    /**
     * Builds the actions that paste the copied presets with their instruments and samples.
     * Pasted presets move to the next free MIDI patch.
     */
    pastePresets(document: BankDocument) {
        const actions = new Array<HistoryAction>();
        if (this.presetClipboard.size === 0) {
            return actions;
        }
        const clonedInstruments = [...document.instruments];
        const clonedSamples = [...document.samples];
        const presetNumbers = new Set<string>();
        for (const p of document.presets) {
            presetNumbers.add(p.toMIDIString());
        }
        for (const oldPreset of this.presetClipboard) {
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
     * Builds the actions that paste the copied instruments with their samples.
     */
    pasteInstruments(document: BankDocument) {
        const clonedInstruments = [...document.instruments];
        const clonedSamples = [...document.samples];
        const actions = new Array<HistoryAction>();
        for (const oldInst of this.instrumentClipboard) {
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
     * Builds the actions that paste the copied samples.
     */
    pasteSamples(document: BankDocument) {
        const alreadyCloned = [...document.samples];
        const actions = new Array<HistoryAction>();
        for (const oldSample of this.sampleClipboard) {
            this.addSample(oldSample, alreadyCloned, actions);
        }
        return actions;
    }
}
