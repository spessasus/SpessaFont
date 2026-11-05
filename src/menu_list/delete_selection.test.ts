import { describe, expect, it } from "vitest";
import { EmptySample, SampleTypes } from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip
} from "../test_utils/bank_fixture.ts";
import { createDeleteSelectionActions } from "./delete_selection.ts";
import { CreateSampleAction } from "./create_actions/create_sample_action.ts";

describe("createDeleteSelectionActions", () => {
    it("deletes every selected preset in one undoable group", () => {
        const session = createTestSession();
        const presets = new Set(session.document.presets);
        const { actions, skipped } = createDeleteSelectionActions(presets);

        expect(skipped).toBe(0);
        const { after } = expectRoundTrip(session, actions);
        expect(after.presets).toEqual([]);
    });

    it("skips the samples that are still used", () => {
        const session = createTestSession();
        const unused = new EmptySample();
        unused.name = "Unused";
        session.history.do([new CreateSampleAction(unused)]);
        const selection = new Set(session.document.samples);

        const { actions, skipped } = createDeleteSelectionActions(selection);
        expect(skipped).toBe(2);
        session.history.do(actions);
        expect(session.document.samples.map((s) => s.name)).toEqual([
            "Saw",
            "Saw 2"
        ]);
        session.history.undo();
        expect(session.document.samples).toContain(unused);
    });

    it("also deletes the unused other half of a stereo sample", () => {
        const session = createTestSession();
        const left = new EmptySample();
        const right = new EmptySample();
        left.name = "Pad L";
        right.name = "Pad R";
        left.setLinkedSample(right, SampleTypes.leftSample);
        session.history.do([
            new CreateSampleAction(left),
            new CreateSampleAction(right)
        ]);

        const { actions } = createDeleteSelectionActions(new Set([left]));
        expectRoundTrip(session, actions);

        expect(session.document.samples).not.toContain(right);
        session.history.undo();
        expect(left.linkedSample).toBe(right);
    });
});
