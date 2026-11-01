import { describe, expect, it } from "vitest";
import { EmptySample, SampleTypes } from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip
} from "../test_utils/bank_fixture.ts";
import { EditSampleAction } from "./edit_sample_action.ts";
import { SetSampleTypeAction } from "./set_sample_type_action.ts";
import { DeleteSampleAction } from "./linked_instruments/delete_sample_action.ts";

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
