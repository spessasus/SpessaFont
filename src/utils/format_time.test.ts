import { describe, expect, it } from "vitest";
import { formatTime } from "./format_time.ts";

describe("formatTime", () => {
    it("formats minutes and padded seconds", () => {
        expect(formatTime(42)).toBe("0:42");
        expect(formatTime(190.9)).toBe("3:10");
        expect(formatTime(0)).toBe("0:00");
    });
});
