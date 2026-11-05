import { describe, expect, it } from "vitest";
import { EmptySample, SampleTypes } from "spessasynth_core";
import { addAndReorderStereoSamples } from "./add_stereo_samples.ts";

function createPair() {
    const left = new EmptySample();
    left.name = "Pad L";
    const right = new EmptySample();
    right.name = "Pad R";
    left.setLinkedSample(right, SampleTypes.leftSample);
    return { left, right };
}

describe("addAndReorderStereoSamples", () => {
    it("puts each pair together and adds a missing half", () => {
        const { left, right } = createPair();
        const mono = new EmptySample();

        expect(addAndReorderStereoSamples([right, mono])).toEqual([
            right,
            left,
            mono
        ]);
        expect(addAndReorderStereoSamples([left, mono, right])).toEqual([
            left,
            right,
            mono
        ]);
    });

    it("reads a one-shot iterable once", () => {
        const { left, right } = createPair();
        function* samples() {
            yield left;
        }
        expect(addAndReorderStereoSamples(samples())).toEqual([left, right]);
    });
});
