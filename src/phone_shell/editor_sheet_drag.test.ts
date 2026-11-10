import { describe, expect, it } from "vitest";
import { getSheetDragResult } from "./editor_sheet_drag.ts";

describe("getSheetDragResult", () => {
    it.each([
        [false, -60, "full"],
        [false, -20, "normal"],
        [false, 60, "close"],
        [true, 60, "normal"],
        [true, -60, "full"]
    ] as const)("full %s, drag %i gives %s", (isFull, deltaY, expected) => {
        expect(getSheetDragResult(isFull, deltaY)).toBe(expected);
    });
});
