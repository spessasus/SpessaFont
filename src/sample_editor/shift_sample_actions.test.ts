import { describe, expect, it } from "vitest";
import { EmptySample, SampleTypes } from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip,
    publishSetUp
} from "../test_utils/bank_fixture.ts";
import { createShiftActions } from "./shift_sample_actions.ts";

function addSample(
    session: ReturnType<typeof createTestSession>,
    name: string,
    key: number
) {
    const sample = new EmptySample();
    sample.name = name;
    sample.setAudioData(new Float32Array(100), 44_100);
    sample.originalKey = key;
    session.document.addSample(sample);
    return sample;
}

describe("createShiftActions", () => {
    it("adds to the root keys, clamped, in one undo step", () => {
        const session = createTestSession();
        const samples = [
            addSample(session, "A", 60),
            addSample(session, "B", 62),
            addSample(session, "C", 120)
        ];
        publishSetUp(session);

        const { actions, clamped } = createShiftActions(samples, {
            property: "originalKey",
            operation: "add",
            value: 12
        });
        expectRoundTrip(session, actions);

        expect(samples.map((s) => s.originalKey)).toEqual([72, 74, 127]);
        expect(clamped).toBe(1);
    });

    it("keeps a multiplied loop end inside the sample", () => {
        const session = createTestSession();
        const sample = addSample(session, "A", 60);
        sample.loopStart = 10;
        sample.loopEnd = 80;
        publishSetUp(session);

        const { actions } = createShiftActions([sample], {
            property: "loopEnd",
            operation: "multiply",
            value: 2
        });
        expectRoundTrip(session, actions);

        expect(sample.loopEnd).toBe(100);
    });

    it("keeps the sign of a multiplied correction", () => {
        const session = createTestSession();
        const sample = addSample(session, "A", 60);
        sample.pitchCorrection = -10;
        publishSetUp(session);

        const { actions } = createShiftActions([sample], {
            property: "pitchCorrection",
            operation: "multiply",
            value: 2
        });
        session.history.do(actions);

        expect(sample.pitchCorrection).toBe(-20);
    });

    it("shifts each half of a stereo pair once", () => {
        const session = createTestSession();
        const left = addSample(session, "L", 60);
        const right = addSample(session, "R", 60);
        left.setLinkedSample(right, SampleTypes.leftSample);
        publishSetUp(session);
        const shift = {
            property: "originalKey",
            operation: "add",
            value: 1
        } as const;

        session.history.do(createShiftActions([left], shift).actions);
        expect([left.originalKey, right.originalKey]).toEqual([61, 61]);

        session.history.do(createShiftActions([left, right], shift).actions);
        expect([left.originalKey, right.originalKey]).toEqual([62, 62]);
    });

    it("changes nothing for a sample that already has the value", () => {
        const session = createTestSession();
        const sample = addSample(session, "A", 127);
        const { actions, clamped } = createShiftActions([sample], {
            property: "originalKey",
            operation: "add",
            value: 5
        });
        expect(actions).toEqual([]);
        expect(clamped).toBe(1);
    });
});
