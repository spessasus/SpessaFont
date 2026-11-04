import { describe, expect, it } from "vitest";
import { EmptySample, SampleTypes, SoundBankLoader } from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip
} from "../test_utils/bank_fixture.ts";
import { EditSampleAction } from "./edit_sample_action.ts";
import { SetSampleTypeAction } from "./set_sample_type_action.ts";
import { DeleteSampleAction } from "./linked_instruments/delete_sample_action.ts";
import { ReplaceSampleAudioAction } from "./replace_sample_audio_action.ts";
import type { HistoryActionGroup } from "../core_backend/history.ts";
import type { BankDocument } from "../core_backend/bank_document.ts";
import {
    createReplaceAudioActions,
    createAutoLoopActions,
    createEqualizerActions,
    createNormalizeActions,
    getExportChannels
} from "./sample_audio.ts";
import { FLAT_EQUALIZER } from "./equalizer/equalizer.ts";

/**
 * Adds a mono sample with a little audio, so a test has a third sample to link.
 */
function addSample(document: BankDocument, name: string) {
    const sample = new EmptySample();
    sample.name = name;
    sample.setAudioData(new Float32Array(16), 44_100);
    document.addSample(sample);
    return sample;
}

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
    it("swaps the sides of a linked pair, and undo swaps them back", () => {
        const session = createTestSession();
        const [left, right] = session.document.samples;
        left.setLinkedSample(right, SampleTypes.leftSample);

        // Ends with the swap done, after checking that undo and redo restore the same bank
        expectRoundTrip(session, [
            new SetSampleTypeAction(left, {
                linkedSample: right,
                type: SampleTypes.rightSample
            })
        ]);
        expect(left.sampleType).toBe(SampleTypes.rightSample);
        expect(right.sampleType).toBe(SampleTypes.leftSample);
        session.history.undo();
        expect(left.sampleType).toBe(SampleTypes.leftSample);
        expect(right.linkedSample).toBe(left);
    });

    it("moves a link to another sample without leaving a half link", () => {
        const session = createTestSession();
        const [a, b] = session.document.samples;
        const c = addSample(session.document, "C");
        a.setLinkedSample(b, SampleTypes.leftSample);

        session.history.do([
            new SetSampleTypeAction(a, {
                linkedSample: c,
                type: SampleTypes.leftSample
            })
        ]);
        expect(a.linkedSample).toBe(c);
        expect(c.linkedSample).toBe(a);
        expect(b.linkedSample).toBeUndefined();
        expect(b.sampleType).toBe(SampleTypes.monoSample);

        session.history.undo();
        expect(a.linkedSample).toBe(b);
        expect(b.linkedSample).toBe(a);
        expect(c.linkedSample).toBeUndefined();
        expect(c.sampleType).toBe(SampleTypes.monoSample);
    });

    it("restores a ROM type on undo instead of mono", () => {
        const session = createTestSession();
        const [sample] = session.document.samples;
        sample.sampleType = SampleTypes.romMonoSample;

        session.history.do([
            new SetSampleTypeAction(sample, {
                linkedSample: undefined,
                type: SampleTypes.monoSample
            })
        ]);
        session.history.undo();

        expect(sample.sampleType).toBe(SampleTypes.romMonoSample);
    });

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

    it("makes the remaining half mono, and undo restores the pair", () => {
        const session = createTestSession();
        const [left, right] = session.document.samples;
        left.setLinkedSample(right, SampleTypes.leftSample);

        session.history.do([new DeleteSampleAction(left)]);
        expect(right.linkedSample).toBeUndefined();
        expect(right.sampleType).toBe(SampleTypes.monoSample);

        session.history.undo();
        expect(left.linkedSample).toBe(right);
        expect(right.linkedSample).toBe(left);
        expect(left.sampleType).toBe(SampleTypes.leftSample);
        expect(right.sampleType).toBe(SampleTypes.rightSample);

        session.history.redo();
        expect(right.linkedSample).toBeUndefined();
    });

    it("saves the remaining half without a link to another sample", () => {
        const session = createTestSession();
        const { bank } = session.document;
        // Sample 0 is where a broken link used to point after saving
        const left = addSample(session.document, "X left");
        const right = addSample(session.document, "X right");
        left.setLinkedSample(right, SampleTypes.leftSample);
        session.history.do([new DeleteSampleAction(right)]);

        const loaded = SoundBankLoader.fromArrayBuffer(bank.writeSF2());
        for (const sample of loaded.samples) {
            expect(sample.linkedSample, sample.name).toBeUndefined();
        }
    });

    it("deletes both halves of a pair in one group and restores them", () => {
        const session = createTestSession();
        const [left, right] = session.document.samples;
        left.setLinkedSample(right, SampleTypes.leftSample);

        session.history.do([
            new DeleteSampleAction(left),
            new DeleteSampleAction(right)
        ]);
        session.history.undo();

        expect(left.linkedSample).toBe(right);
        expect(right.linkedSample).toBe(left);
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

/**
 * `snapshotBank` leaves the audio out, so audio actions check their round trip here.
 */
function expectAudioRoundTrip(
    session: ReturnType<typeof createTestSession>,
    actions: HistoryActionGroup
) {
    const audio = () => session.document.samples.map((s) => s.getAudioData());
    const before = audio();
    session.history.do(actions);
    const after = audio();
    expect(after).not.toEqual(before);
    session.history.undo();
    expect(audio()).toEqual(before);
    session.history.redo();
    expect(audio()).toEqual(after);
}

describe("sample audio helpers", () => {
    it("normalizes a stereo pair by one amount and skips silence", () => {
        const session = createTestSession();
        const [left, right] = session.document.samples;
        left.setAudioData(new Float32Array([0.25, -0.5]), 44_100);
        right.setAudioData(new Float32Array([0.125, 0.25]), 44_100);
        left.setLinkedSample(right, SampleTypes.leftSample);

        expectAudioRoundTrip(session, createNormalizeActions([right]));
        expect([...left.getAudioData()]).toEqual([0.5, -1]);
        expect([...right.getAudioData()]).toEqual([0.25, 0.5]);

        left.setAudioData(new Float32Array(3), 44_100);
        right.setAudioData(new Float32Array(3), 44_100);
        expect(createNormalizeActions([left])).toEqual([]);
    });

    it("equalizes both halves once, keeps the loop, and reports clipping", () => {
        const session = createTestSession();
        const [left, right] = session.document.samples;
        left.setLinkedSample(right, SampleTypes.leftSample);
        left.setAudioData(new Float32Array([0.5, -0.25, 0.75]), 44_100);
        left.loopStart = 1;
        left.loopEnd = 2;

        // The source peaks at 0.75, so only the louder version clips
        expect(createEqualizerActions([left], FLAT_EQUALIZER).isClipping).toBe(
            false
        );
        const louder = { ...FLAT_EQUALIZER, gain: 20 * Math.log10(2) };
        const { actions, isClipping } = createEqualizerActions(
            [left, right],
            louder
        );
        expect(actions).toHaveLength(2);
        expect(isClipping).toBe(true);
        expectAudioRoundTrip(session, actions);
        const data = [...left.getAudioData()];
        expect(data[0]).toBeCloseTo(1);
        expect(data[2]).toBeCloseTo(1.5);
        expect(left).toMatchObject({ loopStart: 1, loopEnd: 2 });
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

    it("auto loops a stereo pair with one loop and skips short samples", () => {
        const session = createTestSession();
        const [left, right] = session.document.samples;
        const wave = (phase: number) =>
            Float32Array.from({ length: 22_050 }, (_, i) =>
                Math.sin((2 * Math.PI * 300.3 * i) / 44_100 + phase)
            );
        left.setAudioData(wave(0), 44_100);
        right.setAudioData(wave(1), 44_100);
        left.setLinkedSample(right, SampleTypes.leftSample);

        const { actions, skipped } = createAutoLoopActions([left]);
        expect(skipped).toBe(0);
        expectRoundTrip(session, actions);
        expect(left.loopStart).toBe(right.loopStart);
        expect(left.loopEnd).toBe(right.loopEnd);
        expect(left.loopEnd - left.loopStart).toBeGreaterThan(4410);

        left.setAudioData(new Float32Array(100), 44_100);
        right.setAudioData(new Float32Array(100), 44_100);
        expect(createAutoLoopActions([right])).toEqual({
            actions: [],
            skipped: 2
        });
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
