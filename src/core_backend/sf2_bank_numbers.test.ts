import { describe, expect, it } from "vitest";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { hasBankNumbersLostInSF2 } from "./sf2_bank_numbers.ts";

function bankWithPreset(bankMSB: number, bankLSB: number, isGMGSDrum: boolean) {
    const { bank } = createTestSession().document;
    const [preset] = bank.presets;
    preset.bankMSB = bankMSB;
    preset.bankLSB = bankLSB;
    preset.isGMGSDrum = isGMGSDrum;
    return bank;
}

describe("hasBankNumbersLostInSF2", () => {
    it("is false for melodic presets with one bank number and plain drum kits", () => {
        expect(hasBankNumbersLostInSF2(bankWithPreset(8, 0, false))).toBe(
            false
        );
        expect(hasBankNumbersLostInSF2(bankWithPreset(0, 8, false))).toBe(
            false
        );
        expect(hasBankNumbersLostInSF2(bankWithPreset(0, 0, true))).toBe(false);
    });

    it("finds a melodic preset that sets both bank numbers", () => {
        expect(hasBankNumbersLostInSF2(bankWithPreset(1, 2, false))).toBe(true);
    });

    it("finds a drum kit with a bank MSB or LSB", () => {
        expect(hasBankNumbersLostInSF2(bankWithPreset(0, 2, true))).toBe(true);
        expect(hasBankNumbersLostInSF2(bankWithPreset(120, 0, true))).toBe(
            true
        );
    });
});
