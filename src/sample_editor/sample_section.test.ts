import { describe, expect, it } from "vitest";
import { getShownSampleSection } from "./sample_section.ts";

describe("getShownSampleSection", () => {
    it("starts a sample on Loop", () => {
        expect(getShownSampleSection(undefined, 7)).toBe("loop");
    });
    it("keeps the section chosen for the shown sample", () => {
        expect(getShownSampleSection({ sampleId: 7, section: "eq" }, 7)).toBe(
            "eq"
        );
    });
    it("starts another sample on Loop", () => {
        const stored = { sampleId: 7, section: "usedBy" } as const;
        expect(getShownSampleSection(stored, 8)).toBe("loop");
        expect(getShownSampleSection(stored, undefined)).toBe("loop");
    });
});
