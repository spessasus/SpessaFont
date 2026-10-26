import {
    BasicMIDI,
    type BasicSoundBank,
    SoundBankLoader
} from "spessasynth_core";

export function loadSoundBank(buf: ArrayBuffer): BasicSoundBank {
    try {
        return SoundBankLoader.fromArrayBuffer(buf);
    } catch (error) {
        // Maybe MIDI can parse it?
        try {
            const mid = BasicMIDI.fromArrayBuffer(buf);
            if (!mid.embeddedSoundBank) {
                throw new Error("No embedded sound bank in this file!");
            }
            return SoundBankLoader.fromArrayBuffer(mid.embeddedSoundBank);
        } catch {
            throw error;
        }
    }
}
