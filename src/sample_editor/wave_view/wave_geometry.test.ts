import { describe, expect, it } from "vitest";
import {
    getPlayheadSample,
    sampleToX,
    xToSample,
    type WaveViewport
} from "./wave_geometry.ts";

const VIEW: WaveViewport = {
    sampleCount: 1000,
    width: 100,
    zoom: 4,
    scrollX: 50
};

describe("wave view geometry", () => {
    it("maps samples to x and back through the scroll and zoom", () => {
        expect(sampleToX(VIEW, 125)).toBe(0);
        expect(sampleToX(VIEW, 250)).toBe(50);
        expect(xToSample(VIEW, 50)).toBe(250);
        for (const sample of [125, 300, 374]) {
            expect(xToSample(VIEW, sampleToX(VIEW, sample))).toBe(sample);
        }
    });

    it("keeps x outside the view inside the sample", () => {
        expect(xToSample({ ...VIEW, scrollX: 0 }, -20)).toBe(0);
        expect(xToSample({ ...VIEW, zoom: 1, scrollX: 0 }, 500)).toBe(1000);
    });

    it("handles an empty sample", () => {
        const empty = { ...VIEW, sampleCount: 0 };
        expect(sampleToX(empty, 0)).toBe(-50);
        expect(xToSample(empty, 10)).toBe(0);
    });
});

describe("getPlayheadSample", () => {
    const base = {
        isLooped: true,
        loopStart: 100,
        loopEnd: 200,
        sampleRate: 1000
    };

    it("plays straight through before the loop end", () => {
        expect(getPlayheadSample({ ...base, elapsed: 0.15 })).toBeCloseTo(150);
        expect(getPlayheadSample({ ...base, elapsed: -0.1 })).toBe(0);
    });

    it("wraps inside the loop", () => {
        expect(getPlayheadSample({ ...base, elapsed: 0.25 })).toBeCloseTo(150);
        expect(getPlayheadSample({ ...base, elapsed: 0.42 })).toBeCloseTo(120);
    });

    it("does not wrap without a loop", () => {
        expect(
            getPlayheadSample({ ...base, isLooped: false, elapsed: 0.25 })
        ).toBeCloseTo(250);
        expect(
            getPlayheadSample({ ...base, loopEnd: 100, elapsed: 0.25 })
        ).toBeCloseTo(250);
    });
});
