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
        this.modulatorClipboard = mods;
    }

    pastePresets(
        m: SoundBankManager,
        setPresets: (p: BasicPreset[]) => unknown,
        setInstruments: (i: BasicInstrument[]) => unknown,
        setSamples: (s: BasicSample[]) => unknown,
        setView: SetViewType
    ) {
        if (this.presetClipboard.size < 1) {
            return;
        }
        // clone manually so it works with our history system
        const clonedInstruments = [...m.instruments];
        const clonedSamples = [...m.samples];
        const clonedPresets = [...m.presets];
        const actions: HistoryAction[] = [];
        this.presetClipboard.forEach((oldPreset) => {
            if (
                clonedPresets.find(
                    (p) =>
                        p.bank === oldPreset.bank &&
                        p.program === oldPreset.program
                )
            ) {
                return;
            }
            const newPreset = new BasicPreset(m);
            newPreset.presetName = oldPreset.presetName;
            newPreset.library = oldPreset.library;
            newPreset.morphology = oldPreset.morphology;
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
                        setView
                    )
                );
            }
            actions.push(
                new CreatePresetAction(newPreset, setPresets, setView)
            );
            clonedPresets.push(newPreset);
        });
        m.modifyBank(actions);
    }

    pasteInstruments(
        m: SoundBankManager,
        setSamples: (s: BasicSample[]) => unknown,
        setInstruments: (i: BasicInstrument[]) => unknown,
        setView: SetViewType
    ) {
        if (this.instrumentClipboard.size < 1) {
            return;
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
    }

    pasteSamples(
        m: SoundBankManager,
        setSamples: (s: BasicSample[]) => unknown,
        setView: SetViewType
    ) {
        if (this.sampleClipboard.size < 1) {
            return;
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
    }

    /**
     * @param {BasicSample} oldSample
     * @param {Set<string>} alreadyCloned sample names
     * @param {HistoryAction[]} actions
     * @param {(s: BasicSample[]) => unknown} setSamples
     * @param {SetViewType} setView
     * @returns {BasicSample}
     * @private
     */
    private addSample(
        oldSample: BasicSample,
        alreadyCloned: BasicSample[],
        actions: HistoryAction[],
        setSamples: (s: BasicSample[]) => unknown,
        setView: SetViewType
    ): BasicSample {
        const exists = alreadyCloned.find(
            (s) => s.sampleName === oldSample.sampleName
        );
        if (exists) {
            return exists;
        }
        const newSample = new BasicSample(
            oldSample.sampleName,
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
        setView: SetViewType
    ): BasicInstrument {
        const exists = alreadyCloned.find(
            (i) => i.instrumentName === oldInst.instrumentName
        );
        if (exists) {
            return exists;
        }
        const newInst = new BasicInstrument();
        newInst.instrumentName = oldInst.instrumentName;
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
                    setView
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
