import { describe, expect, it } from "vitest";
import { createTestSession, publishSetUp } from "../test_utils/bank_fixture.ts";
import { getObjectId } from "../utils/object_id.ts";
import {
    getMinimapSegments,
    getScrollForKey,
    getSplitsCenter,
    getViewColumnIndexes,
    getVisibleKeys
} from "./zone_minimap_math.ts";
import type { KeySplit } from "../utils/zone_splits.ts";

function split(min: number, max: number, zoneId = min): KeySplit {
    return {
        keys: { min, max },
        velocities: { min: 0, max: 127 },
        zoneId
    };
}

describe("zone minimap", () => {
    it("colors the splits in order, cycling four colors", () => {
        const segments = getMinimapSegments(
            [
                split(0, 10),
                split(11, 20),
                split(21, 30),
                split(31, 40),
                split(41, 50)
            ],
            new Map()
        );
        expect(segments.map((s) => s.color)).toEqual([1, 2, 3, 4, 1]);
        expect(segments[1]).toEqual({ start: 11, end: 20, color: 2 });
    });

    it("colors a split by its zone column, so preset splits share their zone's color", () => {
        const segments = getMinimapSegments(
            [split(0, 10, 7), split(11, 20, 7), split(21, 30, 8)],
            new Map([
                [7, 1],
                [8, 4]
            ])
        );
        expect(segments.map((s) => s.color)).toEqual([2, 2, 1]);
    });

    it("finds the grid column of each zone of the shown element", () => {
        const session = createTestSession();
        publishSetUp(session);
        const { views } = session.store.getSnapshot();
        const [preset] = session.document.presets;
        const [instrument] = session.document.instruments;
        expect(getViewColumnIndexes(preset, views)).toEqual(
            new Map([[getObjectId(preset.zones[0]), 0]])
        );
        // The built-in sample instrument has two zones in their own columns
        expect(getViewColumnIndexes(instrument, views)).toEqual(
            new Map(
                instrument.zones.map((zone, index) => [
                    getObjectId(zone),
                    index
                ])
            )
        );
        expect(getViewColumnIndexes("info", views)).toEqual(new Map());
        session.close();
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
