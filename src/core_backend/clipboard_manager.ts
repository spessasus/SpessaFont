import {
    type BasicInstrument,
    type BasicPreset,
    type BasicSample,
    Modulator
} from "spessasynth_core";
import type SoundBankManager from "./sound_bank_manager.ts";

export class ClipboardManager {
    private modulatorClipboard: Modulator[] = [];
    private sampleClipboard: BasicSample[] = [];
    private instrumentClipboard: BasicInstrument[] = [];
    private presetClipboard: BasicPreset[] = [];

    getModulators() {
        return this.modulatorClipboard.map((m) => Modulator.copy(m));
    }

    hasSamples() {
        return this.sampleClipboard.length > 0;
    }

    hasInstruments() {
        return this.instrumentClipboard.length > 0;
    }

    hasPresets() {
        return this.presetClipboard.length > 0;
    }

    copyPresets(p: BasicPreset[]) {
        this.presetClipboard = p;
    }

    copyInstruments(i: BasicInstrument[]) {
        this.instrumentClipboard = i;
    }

    copySamples(s: BasicSample[]) {
        this.sampleClipboard = s;
    }

    pasteSamples(m: SoundBankManager) {
        this.sampleClipboard.forEach((s) => m.cloneSample(s));
    }

    pasteInstruments(m: SoundBankManager) {
        this.instrumentClipboard.forEach((i) => m.cloneInstrument(i));
    }

    pastePresets(m: SoundBankManager) {
        this.presetClipboard.forEach((p) => m.clonePreset(p));
    }

    copyModulators(mods: Modulator[]) {
        this.modulatorClipboard = mods;
    }
}
