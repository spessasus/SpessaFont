import { describe, expect, it } from "vitest";
import { BasicSoundBank, MIDIBuilder } from "spessasynth_core";
import { loadSoundBank } from "./load_sound_bank.ts";

function writeFourCC(view: DataView, offset: number, fourCC: string) {
    for (const [i, char] of [...fourCC].entries()) {
        view.setUint8(offset + i, char.codePointAt(0) ?? 0);
    }
}

/**
 * The sample bank with an `sm24` chunk after its `smpl` chunk, as a 24-bit SF2 has.
 */
function createSm24File() {
    const file = BasicSoundBank.getSampleSoundBankFile();
    const view = new DataView(file);
    let offset = 12;
    while (
        String.fromCodePoint(...new Uint8Array(file, offset + 8, 4)) !== "sdta"
    ) {
        offset += 8 + view.getUint32(offset + 4, true);
    }
    const listSize = view.getUint32(offset + 4, true);
    const listEnd = offset + 8 + listSize;
    const chunk = new DataView(new ArrayBuffer(12));
    writeFourCC(chunk, 0, "sm24");
    chunk.setUint32(4, 4, true);

    const out = new Uint8Array(file.byteLength + chunk.byteLength);
    out.set(new Uint8Array(file, 0, listEnd));
    out.set(
        new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength),
        listEnd
    );
    out.set(new Uint8Array(file, listEnd), listEnd + chunk.byteLength);
    const outView = new DataView(out.buffer);
    outView.setUint32(offset + 4, listSize + chunk.byteLength, true);
    outView.setUint32(4, view.getUint32(4, true) + chunk.byteLength, true);
    return out.buffer;
}

describe("loadSoundBank", () => {
    it("says that a MIDI file has no bank, instead of a header error", () => {
        const midi = new MIDIBuilder({ name: "song" });
        midi.noteOn(0, 0, 0, 60, 100);
        midi.flush();

        expect(() => loadSoundBank(midi.writeMIDI())).toThrow(
            "No embedded sound bank"
        );
    });

    it("reports the bank's own error for a file that is not MIDI either", () => {
        expect(() =>
            loadSoundBank(new TextEncoder().encode("MThd? no").buffer)
        ).toThrow(/RIFF/);
    });

    it("tells when the file has 24-bit samples", () => {
        expect(
            loadSoundBank(BasicSoundBank.getSampleSoundBankFile())
                .has24BitSamples
        ).toBe(false);
        const loaded = loadSoundBank(createSm24File());
        expect(loaded.has24BitSamples).toBe(true);
        expect(loaded.bank.samples.length).toBeGreaterThan(0);
    });
});
