import { describe, expect, it } from "vitest";
import { getPinchScroll, getPinchZoom } from "./wave_pinch.ts";

describe("wave pinch", () => {
    it("scales the zoom with the distance ratio", () => {
        expect(
            getPinchZoom({
                startZoom: 2,
                startDistance: 100,
                distance: 200,
                maxZoom: 50
            })
        ).toBe(4);
    });

    it("clamps the zoom to 1 and the maximum", () => {
        const base = { startZoom: 2, startDistance: 100, maxZoom: 50 };
        expect(getPinchZoom({ ...base, distance: 10 })).toBe(1);
        expect(getPinchZoom({ ...base, distance: 100_000 })).toBe(50);
    });

    it("keeps the sample under the pinch center", () => {
        const width = 400;
        const sampleCount = 10_000;
        const centerX = 130;
        const scrollX = 250;
        const sampleAt = (zoom: number, scroll: number) =>
            ((centerX + scroll) / (width * zoom)) * sampleCount;
        const before = sampleAt(2, scrollX);
        const newScroll = getPinchScroll({
            centerX,
            scrollX,
            oldZoom: 2,
            newZoom: 5
        });
        expect(Math.abs(sampleAt(5, newScroll) - before)).toBeLessThan(1);
    });

    it("never scrolls below zero", () => {
        expect(
            getPinchScroll({ centerX: 10, scrollX: 0, oldZoom: 4, newZoom: 1 })
        ).toBe(0);
    });
});
