import { describe, expect, it } from "vitest";
import { parseTypedNumber } from "./parse_typed_number.ts";

describe("parseTypedNumber", () => {
    it("reads plain, signed, decimal and exponent numbers", () => {
        expect(parseTypedNumber("44100")).toBe(44_100);
        expect(parseTypedNumber(" -12 ")).toBe(-12);
        expect(parseTypedNumber("0.5")).toBe(0.5);
        expect(parseTypedNumber(".5")).toBe(0.5);
        expect(parseTypedNumber("1e3")).toBe(1000);
    });

    it("takes a decimal comma", () => {
        expect(parseTypedNumber("1,5")).toBe(1.5);
    });

    it("refuses empty text and text that is not a number", () => {
        expect(parseTypedNumber("")).toBeUndefined();
        expect(parseTypedNumber(" ".repeat(3))).toBeUndefined();
        expect(parseTypedNumber("abc")).toBeUndefined();
        expect(parseTypedNumber("-")).toBeUndefined();
    });

    it("ignores what is left of a partly deleted suffix", () => {
        expect(parseTypedNumber("62 (C", " (C4)")).toBe(62);
        expect(parseTypedNumber("44100H", "Hz")).toBe(44_100);
        expect(parseTypedNumber("50 %", "%")).toBe(50);
    });

    it("refuses a typo after the number instead of guessing", () => {
        expect(parseTypedNumber("44.1k", "Hz")).toBeUndefined();
        expect(parseTypedNumber("6O")).toBeUndefined();
        expect(parseTypedNumber("1.5.3")).toBeUndefined();
    });
});
