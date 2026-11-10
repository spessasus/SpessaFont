import { describe, expect, it } from "vitest";
import { getClickedSelection, selectBetween } from "./modulator_selection.ts";

const IDS = [10, 11, 12, 13, 14];

describe("getClickedSelection", () => {
    it("toggles the clicked item", () => {
        const selected = getClickedSelection(IDS, new Set(), null, 12, false);
        expect([...selected]).toEqual([12]);
        expect([...getClickedSelection(IDS, selected, 12, 12, false)]).toEqual(
            []
        );
    });

    it("selects the range from the anchor on a shift click", () => {
        const selected = getClickedSelection(IDS, new Set([11]), 11, 13, true);
        expect([...selected].toSorted((a, b) => a - b)).toEqual([11, 12, 13]);
    });

    it("selects backwards from the anchor too", () => {
        const selected = getClickedSelection(IDS, new Set(), 14, 12, true);
        expect([...selected].toSorted((a, b) => a - b)).toEqual([12, 13, 14]);
    });

    it("deselects the range when the clicked item was selected", () => {
        const selected = getClickedSelection(IDS, new Set(IDS), 10, 12, true);
        expect([...selected].toSorted((a, b) => a - b)).toEqual([13, 14]);
    });

    it("treats a shift click without a usable anchor as a plain click", () => {
        expect([
            ...getClickedSelection(IDS, new Set(), null, 12, true)
        ]).toEqual([12]);
        // The anchor was deleted from the list
        expect([...getClickedSelection(IDS, new Set(), 99, 12, true)]).toEqual([
            12
        ]);
    });
});

describe("selectBetween", () => {
    it("fills the gap between the first and last selected modulator", () => {
        expect(selectBetween([1, 2, 3, 4, 5], new Set([2, 4]))).toEqual(
            new Set([2, 3, 4])
        );
    });

    it("keeps a selection of one as it is", () => {
        expect(selectBetween([1, 2, 3, 4, 5], new Set([3]))).toEqual(
            new Set([3])
        );
    });
});
