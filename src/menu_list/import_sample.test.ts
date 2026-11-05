import { describe, expect, it } from "vitest";
import { audioToWav } from "spessasynth_core";
import {
    createSamplesImportActions,
    PLAIN_IMPORT,
    prepareImportedAudio
} from "./import_sample.ts";
import { readWavLoop } from "./wav_loop.ts";

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
