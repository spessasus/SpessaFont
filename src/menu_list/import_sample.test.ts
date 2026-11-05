import { describe, expect, it } from "vitest";
import { createSamplesImportActions } from "./import_sample.ts";

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
