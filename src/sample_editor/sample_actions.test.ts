import { describe, expect, it } from "vitest";
import {
    type BasicSample,
    EmptySample,
    SampleTypes,
    SoundBankLoader
} from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip,
    publishSetUp
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

/**
 * The audio as the mirror has it, which is what the editor reads.
 */
async function readAudio(
    session: ReturnType<typeof createTestSession>,
    sample: BasicSample
) {
    return [...(await session.readAudio(sample))];
}

/**
 * Gives a sample new audio outside the history, as a test set-up.
 */
function setAudio(
    session: ReturnType<typeof createTestSession>,
    sample: BasicSample,
    data: number[],
    sampleRate = 44_100
) {
    sample.setAudioData(new Float32Array(data), sampleRate);
    publishSetUp(session);
}

describe("ReplaceSampleAudioAction", () => {
    it("replaces the audio and loop points, and undo restores them", async () => {
        const session = createTestSession();
        const sample = session.document.samples[0];
        const before = {
            data: await readAudio(session, sample),
            sampleRate: sample.sampleRate,
            loopStart: sample.loopStart,
            loopEnd: sample.loopEnd
        };
        const data = new Float32Array([0, 0.5, -0.5, 0.25]);

        session.history.do([
            await ReplaceSampleAudioAction.create(session, sample, {
                data,
                sampleRate: 22_050
            })
        ]);
        expect(await readAudio(session, sample)).toEqual([...data]);
        expect(sample).toMatchObject({
            sampleRate: 22_050,
            loopStart: 0,
            loopEnd: 4
        });
        expect(session.history.isDirty).toBe(true);

        session.history.undo();
        expect(await readAudio(session, sample)).toEqual(before.data);
        expect(sample).toMatchObject({
            sampleRate: before.sampleRate,
            loopStart: before.loopStart,
            loopEnd: before.loopEnd
        });

        session.history.redo();
        expect(await readAudio(session, sample)).toEqual([...data]);
    });

    it("restores the compressed stream of a compressed sample", async () => {
        const session = createTestSession();
        const sample = session.document.samples[0];
        const stream = new Uint8Array([1, 2, 3, 4]);
        sample.setCompressedData(stream);
        publishSetUp(session);

        session.history.do([
            await ReplaceSampleAudioAction.create(session, sample, {
                data: new Float32Array(8),
                sampleRate: 44_100
            })
        ]);
        const replaced = await session.readStoredData(sample);
        expect(replaced.form).toBe("float32");

        session.history.undo();
        expect(await session.readStoredData(sample)).toEqual({
            form: "vorbis",
            data: stream
        });
    });
});

/**
 * `snapshotBank` leaves the audio out, so audio actions check their round trip here.
 */
async function expectAudioRoundTrip(
    session: ReturnType<typeof createTestSession>,
    actions: HistoryActionGroup
) {
    const audio = () =>
        Promise.all(session.document.samples.map((s) => readAudio(session, s)));
    const before = await audio();
    session.history.do(actions);
    const after = await audio();
    expect(after).not.toEqual(before);
    session.history.undo();
    expect(await audio()).toEqual(before);
    session.history.redo();
    expect(await audio()).toEqual(after);
}

describe("sample audio helpers", () => {
    it("normalizes a stereo pair by one amount and skips silence", async () => {
        const session = createTestSession();
        const [left, right] = session.document.samples;
        left.setAudioData(new Float32Array([0.25, -0.5]), 44_100);
        left.setLinkedSample(right, SampleTypes.leftSample);
        setAudio(session, right, [0.125, 0.25]);

        await expectAudioRoundTrip(
            session,
            await createNormalizeActions(session, [right])
        );
        expect(await readAudio(session, left)).toEqual([0.5, -1]);
        expect(await readAudio(session, right)).toEqual([0.25, 0.5]);

        left.setAudioData(new Float32Array(3), 44_100);
        setAudio(session, right, [0, 0, 0]);
        expect(await createNormalizeActions(session, [left])).toEqual([]);
    });

    it("equalizes both halves once, keeps the loop, and reports clipping", async () => {
        const session = createTestSession();
        const [left, right] = session.document.samples;
        left.setLinkedSample(right, SampleTypes.leftSample);
        left.loopStart = 1;
        left.loopEnd = 2;
        setAudio(session, left, [0.5, -0.25, 0.75]);

        // The source peaks at 0.75, so only the louder version clips
        const flat = await createEqualizerActions(
            session,
            [left],
            FLAT_EQUALIZER
        );
        expect(flat.isClipping).toBe(false);
        const louder = { ...FLAT_EQUALIZER, gain: 20 * Math.log10(2) };
        const { actions, isClipping } = await createEqualizerActions(
            session,
            [left, right],
            louder
        );
        expect(actions).toHaveLength(2);
        expect(isClipping).toBe(true);
        await expectAudioRoundTrip(session, actions);
        const data = await readAudio(session, left);
        expect(data[0]).toBeCloseTo(1);
        expect(data[2]).toBeCloseTo(1.5);
        expect(left).toMatchObject({ loopStart: 1, loopEnd: 2 });
    });

    it("splits stereo audio over a stereo pair and mixes it for a mono sample", async () => {
        const session = createTestSession();
        const [left, right] = session.document.samples;
        const channels = [new Float32Array([1, 1]), new Float32Array([0, 0])];

        const mono = await createReplaceAudioActions(
            session,
            left,
            channels,
            44_100
        );
        session.history.do(mono ?? []);
        expect(await readAudio(session, left)).toEqual([0.5, 0.5]);
        session.history.undo();

        session.history.do([
            new SetSampleTypeAction(left, {
                linkedSample: right,
                type: SampleTypes.leftSample
            })
        ]);
        session.history.do(
            (await createReplaceAudioActions(
                session,
                right,
                channels,
                44_100
            )) ?? []
        );
        expect(await readAudio(session, right)).toEqual([0, 0]);
        expect(await readAudio(session, left)).toEqual([1, 1]);
        expect(
            await createReplaceAudioActions(
                session,
                left,
                [...channels, ...channels],
                1
            )
        ).toBeUndefined();
    });

    it("auto loops a stereo pair with one loop and skips short samples", async () => {
        const session = createTestSession();
        const [left, right] = session.document.samples;
        const wave = (phase: number) =>
            Float32Array.from({ length: 22_050 }, (_, i) =>
                Math.sin((2 * Math.PI * 300.3 * i) / 44_100 + phase)
            );
        left.setAudioData(wave(0), 44_100);
        right.setAudioData(wave(1), 44_100);
        left.setLinkedSample(right, SampleTypes.leftSample);
        publishSetUp(session);

        const { actions, skipped } = await createAutoLoopActions(session, [
            left
        ]);
        expect(skipped).toBe(0);
        expectRoundTrip(session, actions);
        expect(left.loopStart).toBe(right.loopStart);
        expect(left.loopEnd).toBe(right.loopEnd);
        expect(left.loopEnd - left.loopStart).toBeGreaterThan(4410);

        left.setAudioData(new Float32Array(100), 44_100);
        setAudio(
            session,
            right,
            Array.from({ length: 100 }, () => 0)
        );
        expect(await createAutoLoopActions(session, [right])).toEqual({
            actions: [],
            skipped: 2
        });
    });

    it("exports a stereo pair as left and right, padded to one length", async () => {
        const session = createTestSession();
        const [left, right] = session.document.samples;
        left.setAudioData(new Float32Array([1, 2, 3, 4]), 44_100);
        setAudio(session, right, [5, 6]);
        const exported = async (sample: BasicSample, isLoopOnly: boolean) => {
            const channels = await getExportChannels(
                session,
                sample,
                isLoopOnly
            );
            return channels.map((c) => [...c]);
        };

        expect(await exported(right, false)).toEqual([[5, 6]]);

        right.setLinkedSample(left, SampleTypes.rightSample);
        expect(await exported(right, false)).toEqual([
            [1, 2, 3, 4],
            [5, 6, 0, 0]
        ]);
        left.loopStart = 1;
        left.loopEnd = 3;
        expect(await exported(left, true)).toEqual([
            [2, 3],
            [6, 0]
        ]);

        // Different rates cannot share a file
        setAudio(session, right, [5, 6], 22_050);
        expect(await exported(left, false)).toEqual([[1, 2, 3, 4]]);
    });
});
