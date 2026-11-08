import { describe, expect, it } from "vitest";
import {
    getMinimapSegments,
    getScrollForKey,
    getSplitsCenter,
    getVisibleKeys
} from "./zone_minimap_math.ts";
import type { KeySplit } from "../utils/zone_splits.ts";

function split(min: number, max: number): KeySplit {
    return {
        keys: { min, max },
        velocities: { min: 0, max: 127 }
    };
}

describe("zone minimap", () => {
    it("colors the splits in order, cycling four colors", () => {
        const segments = getMinimapSegments([
            split(0, 10),
            split(11, 20),
            split(21, 30),
            split(31, 40),
            split(41, 50)
        ]);
        expect(segments.map((s) => s.color)).toEqual([1, 2, 3, 4, 1]);
        expect(segments[1]).toEqual({ start: 11, end: 20, color: 2 });
    });

    it("maps the scroll position to keys and back", () => {
        expect(getVisibleKeys(0, 350, 1280)).toEqual({ first: 0, last: 34 });
        expect(getScrollForKey(64, 350, 1280)).toBe(470);
        expect(getScrollForKey(0, 350, 1280)).toBe(0);
        expect(getScrollForKey(127, 350, 1280)).toBe(930);
    });

    it("centers on the middle of the ranges", () => {
        expect(getSplitsCenter([split(0, 47), split(48, 69)])).toBe(34);
        expect(getSplitsCenter(undefined)).toBeUndefined();
        expect(getSplitsCenter([])).toBeUndefined();
    });
});
