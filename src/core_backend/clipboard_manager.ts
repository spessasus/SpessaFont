import {
    BasicInstrument,
    BasicPreset,
    BasicSample,
    type MIDIPatch,
    MIDIPatchTools,
    Modulator
} from "spessasynth_core";
import type SoundBankManager from "./sound_bank_manager.ts";
import { CreateSampleAction } from "../menu_list/create_actions/create_sample_action.ts";
import type { SetViewType } from "../bank_editor/bank_editor.tsx";
import { CreateInstrumentAction } from "../menu_list/create_actions/create_instrument_action.ts";
import type { HistoryAction } from "./history.ts";
import { CreatePresetAction } from "../menu_list/create_actions/create_preset_actions.ts";

export class ClipboardManager {
    private modulatorClipboard: Modulator[] = [];
    private sampleClipboard = new Set<BasicSample>();
    private instrumentClipboard = new Set<BasicInstrument>();
    private presetClipboard = new Set<BasicPreset>();

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

    // returns the count of pasted elements
    pastePresets(
        m: SoundBankManager,
        setPresets: (p: BasicPreset[]) => unknown,
        setInstruments: (i: BasicInstrument[]) => unknown,
        setSamples: (s: BasicSample[]) => unknown,
        setView: SetViewType
    ): number {
        if (this.presetClipboard.size < 1) {
            return 0;
        }
        // clone manually so it works with our history system
        const clonedInstruments = [...m.instruments];
        const clonedSamples = [...m.samples];
        const clonedPresets = [...m.presets];
        const actions: HistoryAction[] = [];
        const presetNumbers = new Set<string>();
        m.presets.forEach((p) => {
            presetNumbers.add(p.toMIDIString());
        });
        this.presetClipboard.forEach((oldPreset) => {
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
            const newPreset = new BasicPreset(m);
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
                        setInstruments,
                        setSamples,
                        setView,
                        false
                    )
                );
                newZone.copyFrom(zone);
            }
            actions.push(
                new CreatePresetAction(newPreset, setPresets, setView)
            );
            clonedPresets.push(newPreset);
            presetNumbers.add(newPreset.toMIDIString());
        });
        m.modifyBank(actions);
        return actions.length;
    }

    // returns the count of pasted elements
    pasteInstruments(
        m: SoundBankManager,
        setSamples: (s: BasicSample[]) => unknown,
        setInstruments: (i: BasicInstrument[]) => unknown,
        setView: SetViewType
    ): number {
        if (this.instrumentClipboard.size < 1) {
            return 0;
        }
        // clone manually so it works with our history system
        const clonedInstruments = [...m.instruments];
        const clonedSamples = [...m.samples];
        const actions: HistoryAction[] = [];
        this.instrumentClipboard.forEach((oldInst) =>
            this.addInstrument(
                oldInst,
                clonedInstruments,
                clonedSamples,
                actions,
                setInstruments,
                setSamples,
                setView
            )
        );
        m.modifyBank(actions);
        return actions.length;
    }

    // returns the count of pasted elements
    pasteSamples(
        m: SoundBankManager,
        setSamples: (s: BasicSample[]) => unknown,
        setView: SetViewType
    ): number {
        if (this.sampleClipboard.size < 1) {
            return 0;
        }
        // clone manually so it works with our history system
        const alreadyCloned = [...m.samples];
        const actions: CreateSampleAction[] = [];
        this.sampleClipboard.forEach((oldSample) =>
            this.addSample(
                oldSample,
                alreadyCloned,
                actions,
                setSamples,
                setView
            )
        );
        m.modifyBank(actions);
        return actions.length;
    }

    /**
     * @param oldSample
     * @param alreadyCloned sample names
     * @param actions
     * @param setSamples
     * @param setView
     * @param duplicate
     * @returns
     * @private
     */
    private addSample(
        oldSample: BasicSample,
        alreadyCloned: BasicSample[],
        actions: HistoryAction[],
        setSamples: (s: BasicSample[]) => unknown,
        setView: SetViewType,
        duplicate = true
    ): BasicSample {
        const names = new Set(alreadyCloned.map((s) => s.name));
        const exists = names.has(oldSample.name);
        const originalName = oldSample.name.substring(0, 37);
        let name = oldSample.name;
        if (exists) {
            if (!duplicate) {
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
        actions.push(new CreateSampleAction(newSample, setSamples, setView));
        alreadyCloned.push(newSample);
        if (oldSample.linkedSample) {
            const newLinked = this.addSample(
                oldSample.linkedSample,
                alreadyCloned,
                actions,
                setSamples,
                setView,
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
        setInstruments: (i: BasicInstrument[]) => unknown,
        setSamples: (s: BasicSample[]) => unknown,
        setView: SetViewType,
        duplicate = true
    ): BasicInstrument {
        const names = new Set(alreadyCloned.map((i) => i.name));
        const exists = names.has(oldInst.name);
        let name = oldInst.name;
        const originalName = oldInst.name.substring(0, 37);
        if (exists) {
            if (!duplicate) {
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
                this.addSample(
                    zone.sample,
                    clonedSamples,
                    actions,
                    setSamples,
                    setView,
                    false
                )
            );
            copiedZone.copyFrom(zone);
        }
        actions.push(
            new CreateInstrumentAction(newInst, setInstruments, setView)
        );
        alreadyCloned.push(newInst);
        return newInst;
    }
}
