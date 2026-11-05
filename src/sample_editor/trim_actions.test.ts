import { describe, expect, it } from "vitest";
import {
    type BasicSample,
    EmptySample,
    GeneratorTypes,
    SampleTypes
} from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip,
    publishSetUp
} from "../test_utils/bank_fixture.ts";
import {
    createRemoveSilenceActions,
    createTrimAfterLoopActions
} from "./trim_actions.ts";
import { findSoundStart, getSilenceCut, shiftLoop } from "./trim_audio.ts";

type Session = ReturnType<typeof createTestSession>;

/**
 * Silence, then a sine wave.
 */
function silenceThenSine(silent: number, length: number) {
    return Float32Array.from({ length }, (_, i) =>
        i < silent ? 0 : Math.sin((i - silent) * 0.05)
    );
}

function addSample(session: Session, name: string, data: Float32Array) {
    const sample = new EmptySample();
    sample.name = name;
    sample.setAudioData(data, 44_100);
    session.document.addSample(sample);
    return sample;
}

async function readLength(session: Session, sample: BasicSample) {
    const audio = await session.readAudio(sample);
    return audio.length;
}

async function readAudio(session: Session, sample: BasicSample) {
    return session.readAudio(sample);
}

describe("findSoundStart", () => {
    it("finds the first audible frame, back at a zero crossing", () => {
        expect(findSoundStart(silenceThenSine(1000, 2000), 44_100)).toBe(1000);
        expect(findSoundStart(new Float32Array(10), 44_100)).toBeUndefined();
    });

    it("keeps the earlier start of channels and stops at a loop start", () => {
        const channels = [
            silenceThenSine(500, 2000),
            silenceThenSine(800, 2000)
        ];
        const noLoop = { loopStart: 0, loopEnd: 2000 };
        expect(getSilenceCut(channels, 44_100, [noLoop, noLoop])).toBe(500);
        const loop = { loopStart: 300, loopEnd: 1500 };
        expect(getSilenceCut(channels, 44_100, [loop, loop])).toBe(300);
    });

    it("keeps a whole-sample loop over the whole sample", () => {
        expect(shiftLoop({ loopStart: 0, loopEnd: 100 }, 100, 10)).toEqual({
            loopStart: 0,
            loopEnd: 90
        });
    });
});

describe("createRemoveSilenceActions", () => {
    it("removes the lead-in and moves the loop, undone in one step", async () => {
        const session = createTestSession();
        const sample = addSample(session, "Sine", silenceThenSine(1000, 5000));
        sample.loopStart = 2000;
        sample.loopEnd = 4000;
        publishSetUp(session);

        const { actions } = await createRemoveSilenceActions(session, [sample]);
        expectRoundTrip(session, actions);

        const audio = await readAudio(session, sample);
        expect(audio.length).toBe(4000);
        expect(audio[1]).toBeCloseTo(Math.sin(0.05));
        expect([sample.loopStart, sample.loopEnd]).toEqual([1000, 3000]);
        session.history.undo();
        expect(await readLength(session, sample)).toBe(5000);
        expect([sample.loopStart, sample.loopEnd]).toEqual([2000, 4000]);
    });

    it("cuts a stereo pair by its earlier start and skips silence", async () => {
        const session = createTestSession();
        const left = addSample(session, "L", silenceThenSine(500, 3000));
        const right = addSample(session, "R", silenceThenSine(800, 3000));
        left.setLinkedSample(right, SampleTypes.leftSample);
        const silent = addSample(session, "Quiet", new Float32Array(100));
        publishSetUp(session);

        const result = await createRemoveSilenceActions(session, [
            left,
            silent
        ]);
        session.history.do(result.actions);

        expect(await readLength(session, left)).toBe(2500);
        expect(await readLength(session, right)).toBe(2500);
        expect(result.silent).toBe(1);
    });
});

describe("createTrimAfterLoopActions", () => {
    it("keeps the loop and a short tail, and skips samples without a loop", async () => {
        const session = createTestSession();
        const looped = addSample(session, "Loop", new Float32Array(50_000));
        looped.loopStart = 1000;
        looped.loopEnd = 10_000;
        const unlooped = addSample(session, "None", new Float32Array(100));
        unlooped.loopStart = 0;
        unlooped.loopEnd = 0;
        publishSetUp(session);

        const { actions, skipped } = await createTrimAfterLoopActions(session, [
            looped,
            unlooped
        ]);
        // The bank snapshot has no audio lengths, so the audio is checked instead
        session.history.do(actions);

        expect(await readLength(session, looped)).toBe(10_008);
        expect([looped.loopStart, looped.loopEnd]).toEqual([1000, 10_000]);
        expect(skipped).toBe(1);
        session.history.undo();
        expect(await readLength(session, looped)).toBe(50_000);
        session.history.redo();
        expect(await readLength(session, looped)).toBe(10_008);
    });

    it("counts trimmed samples that a zone plays past the loop", async () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const sample = addSample(session, "Loop", new Float32Array(1000));
        sample.loopStart = 100;
        sample.loopEnd = 500;
        const zone = instrument.createZone(sample);
        zone.setGenerator(GeneratorTypes.sampleModes, 3);
        publishSetUp(session);

        const { losesTail } = await createTrimAfterLoopActions(session, [
            sample
        ]);
        expect(losesTail).toBe(1);
    });
});
