import { describe, expect, it } from "vitest";
import { buildCellText, buildRangeText } from "./cell_sheet_text.ts";
import { parseCellText } from "../cell/parse_generator_text.ts";

describe("buildCellText", () => {
    it.each([
        ["set", "6", "6", "set", 6],
        ["set", "-2", "-2", "set", -2],
        ["add", "2", "+2", "add", 2],
        ["add", "3", "+3", "add", 3],
        ["add", "-2", "+-2", "add", -2],
        ["multiply", "0.5", "x0.5", "multiply", 0.5],
        ["multiply", "0,5", "x0,5", "multiply", 0.5]
    ] as const)("%s %s sends %s", (mode, typed, text, kind, value) => {
        expect(buildCellText(mode, typed, false)).toBe(text);
        expect(parseCellText(text)).toEqual({ kind, value });
    });

    it("drops a typed prefix, keeps abc text and sends nothing when empty", () => {
        expect(buildCellText("add", "+3", false)).toBe("+3");
        expect(buildCellText("multiply", "x2", false)).toBe("x2");
        expect(buildCellText("multiply", "X2", false)).toBe("x2");
        expect(buildCellText("multiply", "*2", false)).toBe("x2");
        expect(buildCellText("add", "+", false)).toBeUndefined();
        expect(buildCellText("set", "+-3", true)).toBe("+-3");
        expect(buildCellText("set", "", false)).toBeUndefined();
        expect(buildCellText("add", "  ", true)).toBeUndefined();
    });
});

describe("buildRangeText", () => {
    it("builds range texts", () => {
        expect(buildRangeText({ kind: "set", low: 48, high: 69 })).toBe(
            "48-69"
        );
        expect(buildRangeText({ kind: "shift", by: 12 })).toBe("+12");
        expect(buildRangeText({ kind: "shift", by: -12 })).toBe("+-12");
    });
});
