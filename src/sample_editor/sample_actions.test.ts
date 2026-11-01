import { describe, expect, it, vi } from "vitest";
import { EmptySample, SampleTypes } from "spessasynth_core";
import {
    createTestManager,
    expectRoundTrip
} from "../test_utils/bank_fixture.ts";
import { EditSampleAction } from "./edit_sample_action.ts";
import { SetSampleTypeAction } from "./set_sample_type_action.ts";
import { DeleteSampleAction } from "./linked_instruments/delete_sample_action.ts";

const noop = () => undefined;

describe("EditSampleAction", () => {
    it("changes a sample property", () => {
        const manager = createTestManager();
        const sample = manager.samples[0];

        expectRoundTrip(manager, [
            new EditSampleAction(
                sample,
                "originalKey",
                sample.originalKey,
                72,
                noop
            )
        ]);
        expect(sample.originalKey).toBe(72);
    });
});

describe("SetSampleTypeAction", () => {
    it("links two mono samples as a stereo pair", () => {
        const manager = createTestManager();
        const [left, right] = manager.samples;

        const { after } = expectRoundTrip(manager, [
            new SetSampleTypeAction(
                left,
                undefined,
                left.sampleType,
                right,
                SampleTypes.leftSample,
                noop
            )
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
        const manager = createTestManager();
        const [left, right] = manager.samples;
        left.setLinkedSample(right, SampleTypes.leftSample);

        const { after } = expectRoundTrip(manager, [
            new SetSampleTypeAction(
                left,
                right,
                SampleTypes.leftSample,
                undefined,
                SampleTypes.monoSample,
                noop
            )
        ]);
        expect(after.samples[0].linkedSample).toBeUndefined();
        expect(after.samples[1].linkedSample).toBeUndefined();
    });
});

describe("DeleteSampleAction", () => {
    it("removes an unused sample and selects its neighbor, then restores and selects it on undo", () => {
        const manager = createTestManager();
        const unused = new EmptySample();
        unused.name = "Unused";
        manager.addSamples(unused);
        const neighbor = manager.samples.at(-2);
        const setView = vi.fn();

        const { after } = expectRoundTrip(manager, [
            new DeleteSampleAction(unused, noop, setView)
        ]);
        expect(after.samples.map((s) => s.name)).not.toContain("Unused");

        manager.undo();
        expect(setView).toHaveBeenLastCalledWith(unused);
        manager.redo();
        expect(setView).toHaveBeenLastCalledWith(neighbor);
    });

    it("keeps the stereo link of a deleted sample so undo restores the pair", () => {
        const manager = createTestManager();
        const [left, right] = manager.samples;
        left.setLinkedSample(right, SampleTypes.leftSample);

        manager.modifyBank([new DeleteSampleAction(left, noop, noop)]);
        expect(right.linkedSample).toBe(left);

        manager.undo();
        expect(left.linkedSample).toBe(right);
    });
});
