import { describe, expect, it } from "vitest";
import { audioToWav } from "spessasynth_core";
import {
    createSamplesImportActions,
    PLAIN_IMPORT,
    prepareImportedAudio
} from "./import_sample.ts";
import { readWavLoop, readWavRootKey } from "./wav_loop.ts";

/**
 * 1000 frames: silence, then a sine wave.
 */
function silenceThenSine(silent: number) {
    return Float32Array.from({ length: 1000 }, (_, i) =>
        i < silent ? 0 : Math.sin((i - silent) * 0.05)
    );
}

describe("prepareImportedAudio", () => {
    it("keeps the audio and loops the whole sample by default", () => {
        const data = silenceThenSine(100);
        const { channels, loop } = prepareImportedAudio(
            [data],
            44_100,
            undefined,
            PLAIN_IMPORT
        );
        expect(channels[0]).toBe(data);
        expect(loop).toEqual({ loopStart: 0, loopEnd: 1000 });
    });

    it("removes the silence of both channels alike", () => {
        const { channels, loop } = prepareImportedAudio(
            [silenceThenSine(100), silenceThenSine(200)],
            44_100,
            undefined,
            { removeSilence: true, trimAfterLoop: false }
        );
        expect(channels.map((c) => c.length)).toEqual([900, 900]);
        expect(loop).toEqual({ loopStart: 0, loopEnd: 900 });
    });

    it("trims after the file's loop only when there is one", () => {
        const options = { removeSilence: false, trimAfterLoop: true };
        const data = new Float32Array(1000);
        const looped = prepareImportedAudio(
            [data],
            44_100,
            { loopStart: 100, loopEnd: 500 },
            options
        );
        expect(looped.channels[0].length).toBe(508);
        const unlooped = prepareImportedAudio(
            [data],
            44_100,
            undefined,
            options
        );
        expect(unlooped.channels[0].length).toBe(1000);
    });
});

/**
 * A WAV file with a `smpl` chunk that loops frames 10 to 19.
 */
function createLoopedWav() {
    const wav = new Uint8Array(audioToWav([new Float32Array(32)], 22_050));
    const smpl = new DataView(new ArrayBuffer(8 + 60));
    for (const [i, c] of [..."smpl"].entries()) {
        smpl.setUint8(i, c.codePointAt(0) ?? 0);
    }
    smpl.setUint32(4, 60, true);
    smpl.setUint32(8 + 28, 1, true);
    smpl.setUint32(8 + 36 + 8, 10, true);
    smpl.setUint32(8 + 36 + 12, 19, true);
    const buffer = new ArrayBuffer(wav.length + smpl.byteLength);
    const file = new Uint8Array(buffer);
    file.set(wav);
    file.set(
        new Uint8Array(smpl.buffer, smpl.byteOffset, smpl.byteLength),
        wav.length
    );
    new DataView(buffer).setUint32(4, file.length - 8, true);
    return buffer;
}

/**
 * A RIFF chunk, padded to an even size unless `isPadded` is false (some writers forget).
 */
function riffChunk(tag: string, body: Uint8Array, isPadded = true) {
    const size = body.length;
    const chunk = new Uint8Array(8 + size + (isPadded ? size % 2 : 0));
    chunk.set(new TextEncoder().encode(tag), 0);
    new DataView(chunk.buffer).setUint32(4, size, true);
    chunk.set(body, 8);
    return chunk;
}

/**
 * An 8-bit mono WAV file at 22,050 Hz made of the chunks after `fmt `.
 */
function createWav(chunks: Uint8Array[]) {
    const fmt = new DataView(new ArrayBuffer(16));
    fmt.setUint16(0, 1, true);
    fmt.setUint16(2, 1, true);
    fmt.setUint32(4, 22_050, true);
    fmt.setUint32(8, 22_050, true);
    fmt.setUint16(12, 1, true);
    fmt.setUint16(14, 8, true);
    const all = [
        riffChunk(
            "fmt ",
            new Uint8Array(fmt.buffer, fmt.byteOffset, fmt.byteLength)
        ),
        ...chunks
    ];
    const total = all.reduce((sum, c) => sum + c.length, 4);
    const file = new Uint8Array(8 + total);
    file.set(new TextEncoder().encode("RIFF"), 0);
    new DataView(file.buffer).setUint32(4, total, true);
    file.set(new TextEncoder().encode("WAVE"), 8);
    let offset = 12;
    for (const chunk of all) {
        file.set(chunk, offset);
        offset += chunk.length;
    }
    return file.buffer;
}

/**
 * A `smpl` chunk body that loops frames 5 to 20, with a unity note.
 */
function smplBody(unityNote = 60, fraction = 0) {
    const body = new DataView(new ArrayBuffer(60));
    body.setUint32(12, unityNote, true);
    body.setUint32(16, fraction, true);
    body.setUint32(28, 1, true);
    body.setUint32(36 + 8, 5, true);
    body.setUint32(36 + 12, 20, true);
    return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
}

/**
 * A `cue ` chunk body with two points, at frames 10 and 90.
 */
function cueBody() {
    const body = new DataView(new ArrayBuffer(4 + 2 * 24));
    body.setUint32(0, 2, true);
    body.setUint32(4 + 20, 10, true);
    body.setUint32(4 + 24 + 4, 1, true);
    body.setUint32(4 + 24 + 20, 90, true);
    return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
}

describe("WAV chunks", () => {
    it("finds the loop after an odd sized chunk that was not padded", () => {
        const wav = createWav([
            riffChunk("data", new Uint8Array(33), false),
            riffChunk("smpl", smplBody())
        ]);
        expect(readWavLoop(wav)).toEqual({
            start: 5,
            end: 21,
            sampleRate: 22_050
        });
    });

    it("takes two named cue points as markers, not a loop", () => {
        const labels = new Uint8Array(4 + 12);
        labels.set(new TextEncoder().encode("adtllabl"), 0);
        const wav = createWav([
            riffChunk("data", new Uint8Array(100)),
            riffChunk("cue ", cueBody()),
            riffChunk("LIST", labels)
        ]);
        expect(readWavLoop(wav)).toBeUndefined();
        const unnamed = createWav([
            riffChunk("data", new Uint8Array(100)),
            riffChunk("cue ", cueBody())
        ]);
        expect(readWavLoop(unnamed)?.start).toBe(10);
    });

    it("reads the unity note and the pitch fraction as the root key", () => {
        // A quarter of a semitone above E4
        const wav = createWav([
            riffChunk("data", new Uint8Array(100)),
            riffChunk("smpl", smplBody(64, 0x40_00_00_00))
        ]);
        expect(readWavRootKey(wav)).toEqual({ key: 64, pitchCorrection: -25 });
        const plain = createWav([riffChunk("data", new Uint8Array(100))]);
        expect(readWavRootKey(plain)).toBeUndefined();
    });
});

describe("readWavLoop", () => {
    it("reads the first loop and the file's rate", () => {
        expect(readWavLoop(createLoopedWav())).toEqual({
            start: 10,
            end: 20,
            sampleRate: 22_050
        });
    });

    it("reads the loop that spessasynth_core writes as cue points", () => {
        const wav = audioToWav([new Float32Array(100)], 100, {
            loop: { start: 0.2, end: 0.8 }
        });
        expect(readWavLoop(wav)).toEqual({
            start: 20,
            end: 80,
            sampleRate: 100
        });
    });

    it("finds nothing in a file without a loop or another format", () => {
        const plain = audioToWav([new Float32Array(4)], 44_100);
        expect(readWavLoop(plain)).toBeUndefined();
        expect(readWavLoop(new ArrayBuffer(4))).toBeUndefined();
    });
});

/**
 * Decodes every file to a short stereo or mono buffer, and fails on files named "bad".
 */
function createStubContext() {
    return {
        decodeAudioData: (data: ArrayBuffer) => {
            const text = new TextDecoder().decode(data);
            if (text === "bad") {
                return Promise.reject(new Error("Not audio"));
            }
            const channels = text === "stereo" ? 2 : 1;
            return Promise.resolve({
                numberOfChannels: channels,
                sampleRate: 44_100,
                length: 64,
                getChannelData: () => new Float32Array(64)
            });
        }
    };
}

describe("createSamplesImportActions", () => {
    it("imports every file it can decode, with root keys from the names", async () => {
        const files = [
            new File(["mono"], "Piano C4.wav"),
            new File(["stereo"], "Piano A4.wav"),
            new File(["bad"], "notes.txt")
        ];
        const { actions, samples, failed } = await createSamplesImportActions(
            createStubContext(),
            files
        );

        expect(failed).toEqual(["notes.txt"]);
        expect(actions).toHaveLength(3);
        expect(samples.map((s) => [s.name, s.originalKey])).toEqual([
            ["Piano C4", 60],
            ["Piano A4L", 69],
            ["Piano A4R", 69]
        ]);
    });
});

describe("createSamplesImportActions names", () => {
    it("gives imported samples names the bank and the import do not have yet", async () => {
        const files = [
            new File(["mono"], "Kick.wav"),
            new File(["mono"], "Kick.wav"),
            new File(["stereo"], "Pad.wav")
        ];
        const { samples } = await createSamplesImportActions(
            createStubContext(),
            files,
            { takenNames: ["Kick", "PadR"] }
        );

        expect(samples.map((s) => s.name)).toEqual([
            "Kick-1",
            "Kick-2",
            "Pad-1L",
            "Pad-1R"
        ]);
    });
});
