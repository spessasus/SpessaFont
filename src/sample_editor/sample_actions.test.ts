import { describe, expect, it } from "vitest";
import { EmptySample, SampleTypes } from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip
} from "../test_utils/bank_fixture.ts";
import { EditSampleAction } from "./edit_sample_action.ts";
import { SetSampleTypeAction } from "./set_sample_type_action.ts";
import { DeleteSampleAction } from "./linked_instruments/delete_sample_action.ts";
import { ReplaceSampleAudioAction } from "./replace_sample_audio_action.ts";
import {
    createReplaceAudioActions,
    getExportChannels,
    normalizeAudio
} from "./sample_audio.ts";

describe("EditSampleAction", () => {
    it("changes a sample property", () => {
        const session = createTestSession();
        const sample = session.document.samples[0];

        expectRoundTrip(session, [
            new EditSampleAction(sample, "originalKey", sample.originalKey, 72)
        ]);
        expect(sample.originalKey).toBe(72);
    });
});

describe("SetSampleTypeAction", () => {
    it("links two mono samples as a stereo pair", () => {
        const session = createTestSession();
        const [left, right] = session.document.samples;

        const { after } = expectRoundTrip(session, [
            new SetSampleTypeAction(left, {
                linkedSample: right,
                type: SampleTypes.leftSample
            })
        ]);
        expect(after.samples[0]).toMatchObject({
            sampleType: SampleTypes.leftSample,
            linkedSample: right.name
        });
        expect(after.samples[1]).toMatchObject({
            sampleType: SampleTypes.rightSample,
            linkedSample: left.name
        });
    });

    it("unlinks a stereo pair back to mono", () => {
        const session = createTestSession();
        const [left, right] = session.document.samples;
        left.setLinkedSample(right, SampleTypes.leftSample);

        const { after } = expectRoundTrip(session, [
            new SetSampleTypeAction(left, {
                linkedSample: undefined,
                type: SampleTypes.monoSample
            })
        ]);
        expect(after.samples[0].linkedSample).toBeUndefined();
        expect(after.samples[1].linkedSample).toBeUndefined();
    });
});

describe("DeleteSampleAction", () => {
    it("removes an unused sample and focuses its neighbor, then restores and focuses it on undo", () => {
        const session = createTestSession();
        const unused = new EmptySample();
        unused.name = "Unused";
        session.document.addSample(unused);
        const neighbor = session.document.samples.at(-2);

        const { after, doFocus, undoFocus } = expectRoundTrip(session, [
            new DeleteSampleAction(unused)
        ]);
        expect(after.samples.map((s) => s.name)).not.toContain("Unused");
        expect(doFocus).toBe(neighbor);
        expect(undoFocus).toBe(unused);
    });

    it("keeps the stereo link of a deleted sample so undo restores the pair", () => {
        const session = createTestSession();
        const [left, right] = session.document.samples;
        left.setLinkedSample(right, SampleTypes.leftSample);

        session.history.do([new DeleteSampleAction(left)]);
        expect(right.linkedSample).toBe(left);

        session.history.undo();
        expect(left.linkedSample).toBe(right);
    });
});

describe("ReplaceSampleAudioAction", () => {
    it("replaces the audio and loop points, and undo restores them", () => {
        const session = createTestSession();
        const sample = session.document.samples[0];
        const before = {
            data: sample.getAudioData(),
            sampleRate: sample.sampleRate,
            loopStart: sample.loopStart,
            loopEnd: sample.loopEnd
        };
        const data = new Float32Array([0, 0.5, -0.5, 0.25]);

        session.history.do([
            new ReplaceSampleAudioAction(sample, { data, sampleRate: 22_050 })
        ]);
        expect(sample.getAudioData()).toBe(data);
        expect(sample).toMatchObject({
            sampleRate: 22_050,
            loopStart: 0,
            loopEnd: 4
        });
        expect(session.history.isDirty).toBe(true);

        session.history.undo();
        expect(sample.getAudioData()).toEqual(before.data);
        expect(sample).toMatchObject({
            sampleRate: before.sampleRate,
            loopStart: before.loopStart,
            loopEnd: before.loopEnd
        });

        session.history.redo();
        expect(sample.getAudioData()).toBe(data);
    });

    it("restores the compressed stream of a compressed sample", () => {
        const session = createTestSession();
        const sample = session.document.samples[0];
        const stream = new Uint8Array([1, 2, 3, 4]);
        sample.setCompressedData(stream);

        session.history.do([
            new ReplaceSampleAudioAction(sample, {
                data: new Float32Array(8),
                sampleRate: 44_100
            })
        ]);
        expect(sample.isCompressed).toBe(false);

        session.history.undo();
        expect(sample.isCompressed).toBe(true);
        expect(sample.getRawData(true)).toBe(stream);
    });
});

describe("sample audio helpers", () => {
    it("normalizes to full scale and leaves silence alone", () => {
        expect([...normalizeAudio(new Float32Array([0.25, -0.5]))]).toEqual([
            0.5, -1
        ]);
        const silence = new Float32Array(3);
        expect(normalizeAudio(silence)).toBe(silence);
    });

    it("splits stereo audio over a stereo pair and mixes it for a mono sample", () => {
        const session = createTestSession();
        const [left, right] = session.document.samples;
        const channels = [new Float32Array([1, 1]), new Float32Array([0, 0])];

        const mono = createReplaceAudioActions(left, channels, 44_100);
        session.history.do(mono ?? []);
        expect([...left.getAudioData()]).toEqual([0.5, 0.5]);
        session.history.undo();

        session.history.do([
            new SetSampleTypeAction(left, {
                linkedSample: right,
                type: SampleTypes.leftSample
            })
        ]);
        session.history.do(
            createReplaceAudioActions(right, channels, 44_100) ?? []
        );
        expect([...right.getAudioData()]).toEqual([0, 0]);
        expect([...left.getAudioData()]).toEqual([1, 1]);
        expect(
            createReplaceAudioActions(left, [...channels, ...channels], 1)
        ).toBeUndefined();
    });

    it("exports a stereo pair as left and right, padded to one length", () => {
        const session = createTestSession();
        const [left, right] = session.document.samples;
        left.setAudioData(new Float32Array([1, 2, 3, 4]), 44_100);
        right.setAudioData(new Float32Array([5, 6]), 44_100);
        const toArrays = (channels: Float32Array[]) =>
            channels.map((c) => [...c]);

        expect(toArrays(getExportChannels(right, false))).toEqual([[5, 6]]);

        right.setLinkedSample(left, SampleTypes.rightSample);
        expect(toArrays(getExportChannels(right, false))).toEqual([
            [1, 2, 3, 4],
            [5, 6, 0, 0]
        ]);
        left.loopStart = 1;
        left.loopEnd = 3;
        expect(toArrays(getExportChannels(left, true))).toEqual([
            [2, 3],
            [6, 0]
        ]);

        // Different rates cannot share a file
        right.setAudioData(new Float32Array([5, 6]), 22_050);
        expect(toArrays(getExportChannels(left, false))).toEqual([
            [1, 2, 3, 4]
        ]);
    });
});
