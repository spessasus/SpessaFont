import { describe, expect, it } from "vitest";
import {
    isLayoutSetting,
    PHONE_LAYOUT_QUERY,
    resolveLayout
} from "./layout_setting.ts";

describe("isLayoutSetting", () => {
    it("accepts the three settings and nothing else", () => {
        for (const value of ["auto", "phone", "desktop"]) {
            expect(isLayoutSetting(value)).toBe(true);
        }
        for (const value of ["tablet", undefined, 1, null]) {
            expect(isLayoutSetting(value)).toBe(false);
        }
    });
});

describe("resolveLayout", () => {
    it.each([
        ["auto", true, "phone"],
        ["auto", false, "desktop"],
        ["phone", true, "phone"],
        ["phone", false, "phone"],
        ["desktop", true, "desktop"],
        ["desktop", false, "desktop"]
    ] as const)(
        "resolves %s with the query at %s to %s",
        (setting, matches, mode) => {
            expect(resolveLayout(setting, matches)).toBe(mode);
        }
    );
});

describe("PHONE_LAYOUT_QUERY", () => {
    it("matches on the short side, so rotating never flips the layout", () => {
        expect(PHONE_LAYOUT_QUERY.split(", ")).toEqual([
            "(pointer: coarse) and (width < 600px)",
            "(pointer: coarse) and (height < 600px)"
        ]);
    });
});
