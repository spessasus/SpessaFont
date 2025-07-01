import {
    type BasicSoundBank,
    IndexedByteArray,
    loadSoundFont,
    MIDI,
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
        const mid = new MIDI(buf);
        if (!mid.embeddedSoundFont) {
            throw new Error("No embedded sound bank.");
        }
        return loadSoundFont(mid.embeddedSoundFont);
    }
    return loadSoundFont(buf);
}
