import { describe, expect, it } from "vitest";
import { SoundBankLoader } from "spessasynth_core";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { hasTextOutsideLatin1 } from "./latin1_text.ts";

describe("hasTextOutsideLatin1", () => {
    it("accepts Latin-1 names", () => {
        const { bank } = createTestSession().document;
        bank.presets[0].name = "Piano à la française";
        expect(hasTextOutsideLatin1(bank)).toBe(false);
    });

    it("finds Polish and CJK text in names and bank info", () => {
        const sample = createTestSession().document.bank;
        sample.samples[0].name = "Próbka ąę";
        expect(hasTextOutsideLatin1(sample)).toBe(true);

        const info = createTestSession().document.bank;
        info.soundBankInfo.comment = "钢琴";
        expect(hasTextOutsideLatin1(info)).toBe(true);
    });

    it("matches what core cannot write back", () => {
        // The mirror has the sample data, so it is what gets written
        const { bank } = createTestSession().mirror;
        bank.presets[0].name = "Żółw";
        const loaded = SoundBankLoader.fromArrayBuffer(bank.writeSF2());
        expect(loaded.presets.some((p) => p.name === "Żółw")).toBe(false);
    });
});
