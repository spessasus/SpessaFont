import {
    type BasicInstrument,
    type BasicPreset,
    type BasicSample,
    type BasicSoundBank,
    Modulator
} from "spessasynth_core";

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

    pasteSamples(b: BasicSoundBank) {
        this.sampleClipboard.forEach((s) => b.cloneSample(s));
    }

    pasteInstruments(b: BasicSoundBank) {
        this.instrumentClipboard.forEach((i) => b.cloneInstrument(i));
    }

    pastePresets(b: BasicSoundBank) {
        this.presetClipboard.forEach((p) => b.clonePreset(p));
    }

    copyModulators(mods: Modulator[]) {
        this.modulatorClipboard = mods;
    }
}
