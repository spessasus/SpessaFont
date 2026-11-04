import { describe, expect, it } from "vitest";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { getViewSplits } from "./zone_splits.ts";

describe("getViewSplits", () => {
    it("covers every key for elements without key ranges", () => {
        // The built-in sample bank sets no key ranges anywhere
        const { presets, instruments } = createTestSession().document;
        // One split per instrument zone, the sample instrument has two
        const full = { min: 0, max: 127 };
        expect(getViewSplits(presets[0])).toEqual([full, full]);
        expect(getViewSplits(instruments[0])).toEqual([full, full]);
    });

    it("uses a zone range when the global range is not set", () => {
        const { instruments } = createTestSession().document;
        instruments[0].zones[0].keyRange = { min: 60, max: 72 };
        expect(getViewSplits(instruments[0])[0]).toEqual({ min: 60, max: 72 });
    });

    it("clamps the instrument splits to the preset zone and global ranges", () => {
        const { presets } = createTestSession().document;
        const [preset] = presets;
        preset.zones[0].instrument.zones[0].keyRange = { min: 40, max: 90 };
        preset.zones[0].keyRange = { min: 50, max: 127 };
        preset.globalZone.keyRange = { min: 0, max: 80 };
        expect(getViewSplits(preset)[0]).toEqual({ min: 50, max: 80 });
    });
});
