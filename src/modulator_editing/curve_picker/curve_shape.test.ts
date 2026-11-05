import { describe, expect, it } from "vitest";
import { ModulatorCurveTypes } from "spessasynth_core";
import { getCurvePoints, getCurveValue } from "./curve_shape.ts";

const linear = {
    curveType: ModulatorCurveTypes.linear,
    bipolar: false,
    positive: true
};

describe("curve shape", () => {
    it("matches the SF2 curve ends", () => {
        expect(getCurveValue(linear, 0)).toBe(0);
        expect(getCurveValue(linear, 1)).toBe(1);
        expect(getCurveValue({ ...linear, positive: false }, 0)).toBe(1);
        expect(getCurveValue({ ...linear, bipolar: true }, 0)).toBe(-1);
        const convex = { ...linear, curveType: ModulatorCurveTypes.convex };
        expect(getCurveValue(convex, 0.5)).toBeGreaterThan(0.5);
        const concave = { ...linear, curveType: ModulatorCurveTypes.concave };
        expect(getCurveValue(concave, 0.5)).toBeLessThan(0.5);
        const toggle = { ...linear, curveType: ModulatorCurveTypes.switch };
        expect(getCurveValue(toggle, 0.4)).toBe(0);
        expect(getCurveValue(toggle, 0.6)).toBe(1);
    });

    it("draws a positive linear curve from the bottom left to the top right", () => {
        const points = getCurvePoints(linear).split(" ");
        expect(points[0]).toBe("15,85");
        expect(points.at(-1)).toBe("85,15");
        expect(points).toHaveLength(71);
    });
});
