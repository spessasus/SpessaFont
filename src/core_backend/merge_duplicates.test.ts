import { describe, expect, it } from "vitest";
import { type BasicSample, EmptySample, SampleTypes } from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip,
    publishSetUp
} from "../test_utils/bank_fixture.ts";
import { findDuplicateSamples } from "./merge_duplicates.ts";
import { DeleteSampleAction } from "../sample_editor/linked_instruments/delete_sample_action.ts";
import { EditSampleAction } from "../sample_editor/edit_sample_action.ts";

type Session = ReturnType<typeof createTestSession>;

function addSample(session: Session, name: string, data: number[]) {
    const sample = new EmptySample();
    sample.name = name;
    sample.setAudioData(new Float32Array(data), 44_100);
    sample.loopEnd = data.length;
    session.document.addSample(sample);
    return sample;
}

/**
 * Finds the duplicates and builds the actions right away.
 */
async function merge(session: Session, scope: ReadonlySet<BasicSample>) {
    const found = await findDuplicateSamples(session, scope);
    return found.createActions();
}

describe("findDuplicateSamples", () => {
    it("points the zones of a copy at the first sample and removes the copy", async () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const a = addSample(session, "A", [0.1, 0.2, 0.3]);
        const b = addSample(session, "B", [0.1, 0.2, 0.3]);
        const c = addSample(session, "C", [0.3, 0.2, 0.1]);
        const zone = instrument.createZone(b);
        instrument.createZone(c);
        publishSetUp(session);

        const { actions, removedCount } = await merge(
            session,
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

        const { actions } = await merge(session, new Set([a, b]));
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

        const { actions, removedCount } = await merge(session, added);
        expectRoundTrip(session, actions);

        expect(removedCount).toBe(2);
        expect(leftZone.sample).toBe(left);
        expect(rightZone.sample).toBe(right);
        const again = await merge(session, added);
        expect(again.actions).toEqual([]);
    });

    it("only merges within the given samples", async () => {
        const session = createTestSession();
        const a = addSample(session, "A", [0.5]);
        addSample(session, "B", [0.5]);
        const c = addSample(session, "C", [0.5]);
        publishSetUp(session);

        const { removedCount } = await merge(session, new Set([a, c]));
        expect(removedCount).toBe(1);
    });

    it("leaves out a kept sample deleted while the audio is read", async () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        // A is unused and comes first, B is the used copy
        const a = addSample(session, "A", [0.1, 0.2, 0.3]);
        const b = addSample(session, "B", [0.1, 0.2, 0.3]);
        const zone = instrument.createZone(b);
        publishSetUp(session);

        const pending = findDuplicateSamples(session, new Set([a, b]));
        session.history.do([new DeleteSampleAction(a)]);
        const found = await pending;
        const { actions, removedCount } = found.createActions();

        expect(removedCount).toBe(0);
        expect(actions).toEqual([]);
        expect(zone.sample).toBe(b);
    });

    it("leaves out a copy edited while the audio is read", async () => {
        const session = createTestSession();
        const a = addSample(session, "A", [0.1, 0.2, 0.3]);
        const b = addSample(session, "B", [0.1, 0.2, 0.3]);
        const c = addSample(session, "C", [0.1, 0.2, 0.3]);
        publishSetUp(session);

        const pending = findDuplicateSamples(session, new Set([a, b, c]));
        // B gets a loop of its own, so it is no longer a copy
        session.history.do([new EditSampleAction(b, "loopEnd", 3, 2)]);
        const found = await pending;
        const { actions, removedCount } = found.createActions();
        session.history.do(actions);

        expect(removedCount).toBe(1);
        expect(session.document.samples).toContain(b);
        expect(session.document.samples).not.toContain(c);
    });

    it("finds nothing left for a second merge that ran alongside the first", async () => {
        const session = createTestSession();
        const a = addSample(session, "A", [0.1, 0.2, 0.3]);
        const b = addSample(session, "B", [0.1, 0.2, 0.3]);
        publishSetUp(session);

        const first = findDuplicateSamples(session, new Set([a, b]));
        const second = findDuplicateSamples(session, new Set([a, b]));
        const [firstFound, secondFound] = await Promise.all([first, second]);
        session.history.do(firstFound.createActions().actions);
        const { actions, removedCount } = secondFound.createActions();

        expect(removedCount).toBe(0);
        expect(() => session.history.do(actions)).not.toThrow();
        expect(session.document.samples).toContain(a);
    });
});
