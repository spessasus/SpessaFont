import {
    BasicInstrument,
    BasicPreset,
    BasicSample,
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
        return this.modulatorClipboard.map((m) => Modulator.copy(m));
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
        this.modulatorClipboard = mods.map((m) => Modulator.copy(m));
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
            presetNumbers.add(`${p.bank}-${p.program}`);
        });
        this.presetClipboard.forEach((oldPreset) => {
            let bank = oldPreset.bank;
            let program = oldPreset.program;
            while (presetNumbers.has(`${bank}-${program}`)) {
                if (bank === 128) {
                    program++;
                } else {
                    bank++;
                    if (bank >= 127) {
                        bank = 0;
                        program++;
                        if (program > 127) {
                            throw new Error(
                                `No free space to paste ${oldPreset.program}`
                            );
                        }
                    }
                }
            }
            const newPreset = new BasicPreset(m);
            newPreset.presetName = oldPreset.presetName;
            newPreset.program = program;
            newPreset.bank = bank;

            newPreset.library = oldPreset.library;
            newPreset.morphology = oldPreset.morphology;
            newPreset.genre = oldPreset.genre;

            newPreset.globalZone.copyFrom(oldPreset.globalZone);
            for (const zone of oldPreset.presetZones) {
                const newZone = newPreset.createZone();
                newZone.copyFrom(zone);
                newZone.setInstrument(
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
            }
            actions.push(
                new CreatePresetAction(newPreset, setPresets, setView)
            );
            clonedPresets.push(newPreset);
            presetNumbers.add(`${bank}-${program}`);
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
     * @param {BasicSample} oldSample
     * @param {Set<string>} alreadyCloned sample names
     * @param {HistoryAction[]} actions
     * @param {(s: BasicSample[]) => unknown} setSamples
     * @param {SetViewType} setView
     * @param {boolean} duplicate
     * @returns {BasicSample}
     * @private
     */
    private addSample(
        oldSample: BasicSample,
        alreadyCloned: BasicSample[],
        actions: HistoryAction[],
        setSamples: (s: BasicSample[]) => unknown,
        setView: SetViewType,
        duplicate: boolean = true
    ): BasicSample {
        const names = new Set(alreadyCloned.map((s) => s.sampleName));
        const exists = names.has(oldSample.sampleName);
        const originalName = oldSample.sampleName.substring(0, 37);
        let name = oldSample.sampleName;
        if (exists) {
            if (!duplicate) {
                const r = alreadyCloned.find(
                    (s) => s.sampleName === oldSample.sampleName
                );
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
            oldSample.samplePitch,
            oldSample.samplePitchCorrection,
            oldSample.sampleType,
            oldSample.sampleLoopStartIndex,
            oldSample.sampleLoopEndIndex
        );
        if (oldSample.isCompressed && oldSample.compressedData) {
            newSample.setCompressedData(oldSample.compressedData.slice());
        } else {
            newSample.setAudioData(oldSample.getAudioData());
        }
        actions.push(new CreateSampleAction(newSample, setSamples, setView));
        alreadyCloned.push(newSample);
        if (oldSample.linkedSample) {
            const newLinked = this.addSample(
                oldSample.linkedSample,
                alreadyCloned,
                actions,
                setSamples,
                setView
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
        duplicate: boolean = true
    ): BasicInstrument {
        const names = new Set(alreadyCloned.map((i) => i.instrumentName));
        const exists = names.has(oldInst.instrumentName);
        let name = oldInst.instrumentName;
        const originalName = oldInst.instrumentName.substring(0, 37);
        if (exists) {
            if (!duplicate) {
                const r = alreadyCloned.find(
                    (i) => i.instrumentName === oldInst.instrumentName
                );
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
        newInst.instrumentName = name;
        newInst.globalZone.copyFrom(oldInst.globalZone);
        for (const zone of oldInst.instrumentZones) {
            const copiedZone = newInst.createZone();
            copiedZone.copyFrom(zone);
            copiedZone.setSample(
                this.addSample(
                    zone.sample,
                    clonedSamples,
                    actions,
                    setSamples,
                    setView,
                    false
                )
            );
        }
        actions.push(
            new CreateInstrumentAction(newInst, setInstruments, setView)
        );
        alreadyCloned.push(newInst);
        return newInst;
    }
}
