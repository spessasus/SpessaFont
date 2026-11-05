import { describe, expect, it } from "vitest";
import { EmptySample, SampleTypes } from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip,
    publishSetUp
} from "../test_utils/bank_fixture.ts";
import { createMergeDuplicateActions } from "./merge_duplicates.ts";

type Session = ReturnType<typeof createTestSession>;

function addSample(session: Session, name: string, data: number[]) {
    const sample = new EmptySample();
    sample.name = name;
    sample.setAudioData(new Float32Array(data), 44_100);
    sample.loopEnd = data.length;
    session.document.addSample(sample);
    return sample;
}

describe("createMergeDuplicateActions", () => {
    it("points the zones of a copy at the first sample and removes the copy", async () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const a = addSample(session, "A", [0.1, 0.2, 0.3]);
        const b = addSample(session, "B", [0.1, 0.2, 0.3]);
        const c = addSample(session, "C", [0.3, 0.2, 0.1]);
        const zone = instrument.createZone(b);
        instrument.createZone(c);
        publishSetUp(session);

        const { actions, removedCount } = await createMergeDuplicateActions(
            session,
            session.document.samples,
            new Set([a, b, c])
        );
        expectRoundTrip(session, actions);

        expect(removedCount).toBe(1);
        expect(session.document.samples).not.toContain(b);
        expect(zone.sample).toBe(a);
        session.history.undo();
        expect(session.document.samples).toContain(b);
        expect(zone.sample).toBe(b);
    });

    it("does not merge the same audio with other loop points", async () => {
        const session = createTestSession();
        const a = addSample(session, "A", [0.1, 0.2, 0.3]);
        const b = addSample(session, "B", [0.1, 0.2, 0.3]);
        b.loopStart = 1;
        publishSetUp(session);

        const { actions } = await createMergeDuplicateActions(
            session,
            session.document.samples,
            new Set([a, b])
        );
        expect(actions).toEqual([]);
    });

    it("merges a stereo pair with an equal pair, both zones following", async () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const left = addSample(session, "Pad L", [0.1, 0.2]);
        const right = addSample(session, "Pad R", [0.3, 0.4]);
        left.setLinkedSample(right, SampleTypes.leftSample);
        const copyLeft = addSample(session, "Zz L", [0.1, 0.2]);
        const copyRight = addSample(session, "Zz R", [0.3, 0.4]);
        copyLeft.setLinkedSample(copyRight, SampleTypes.leftSample);
        // A mono sample with the left audio is not a stereo half
        const mono = addSample(session, "Zz mono", [0.1, 0.2]);
        const added = new Set([left, right, copyLeft, copyRight, mono]);
        const leftZone = instrument.createZone(copyLeft);
        const rightZone = instrument.createZone(copyRight);
        publishSetUp(session);

        const { actions, removedCount } = await createMergeDuplicateActions(
            session,
            session.document.samples,
            added
        );
        expectRoundTrip(session, actions);

        expect(removedCount).toBe(2);
        expect(leftZone.sample).toBe(left);
        expect(rightZone.sample).toBe(right);
        const again = await createMergeDuplicateActions(
            session,
            session.document.samples,
            added
        );
        expect(again.actions).toEqual([]);
    });

    it("only merges within the given samples", async () => {
        const session = createTestSession();
        const a = addSample(session, "A", [0.5]);
        addSample(session, "B", [0.5]);
        const c = addSample(session, "C", [0.5]);
        publishSetUp(session);

        const { removedCount } = await createMergeDuplicateActions(
            session,
            session.document.samples,
            new Set([a, c])
        );
        expect(removedCount).toBe(1);
    });
});
