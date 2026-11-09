import { describe, expect, it } from "vitest";
import { getDrawerOffset } from "./drawer_offset.ts";

describe("getDrawerOffset", () => {
    it.each([
        ["collapsed", "var(--phone-handle-height)"],
        [
            "keys",
            "calc(var(--phone-handle-height) + var(--phone-strip-height) + var(--phone-keys-height))"
        ]
    ] as const)("offsets the toasts by the %s drawer", (drawer, offset) => {
        expect(getDrawerOffset(drawer)).toBe(offset);
    });
});
