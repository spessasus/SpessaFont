import {
    BasicMIDI,
    type BasicSoundBank,
    IndexedByteArray,
    SoundBankLoader,
    SpessaSynthCoreUtils
} from "spessasynth_core";

export function loadSoundBank(buf: ArrayBuffer): BasicSoundBank {
    // check
    const identifier = buf.slice(8, 12);
    const text = SpessaSynthCoreUtils.readBytesAsString(
        new IndexedByteArray(identifier),
        4
    );
    if (text === "RMID") {
        const mid = BasicMIDI.fromArrayBuffer(buf);
        if (!mid.embeddedSoundBank) {
            throw new Error("No embedded sound bank.");
        }
        return SoundBankLoader.fromArrayBuffer(mid.embeddedSoundBank);
    }
    return SoundBankLoader.fromArrayBuffer(buf);
}
