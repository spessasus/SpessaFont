import { describe, expect, it } from "vitest";
import { getRootKeyFromName } from "./root_key_from_name.ts";

describe("getRootKeyFromName", () => {
    it("reads note names with sharps and flats, C4 being 60", () => {
        expect(getRootKeyFromName("Piano C4")).toBe(60);
        expect(getRootKeyFromName("Piano_F#2")).toBe(42);
        expect(getRootKeyFromName("Strings Bb3 L")).toBe(58);
        expect(getRootKeyFromName("Cs4")).toBe(61);
        expect(getRootKeyFromName("Bass A-1")).toBe(9);
    });

    it("takes the last note and ignores words that only start with a note letter", () => {
        expect(getRootKeyFromName("Grand A2 soft C5")).toBe(72);
        expect(getRootKeyFromName("Bass Echo")).toBeUndefined();
    });

    it("reads a MIDI number only in the piano's range, and prefers a note name", () => {
        expect(getRootKeyFromName("Guitar 064")).toBe(64);
        expect(getRootKeyFromName("Violin 01")).toBeUndefined();
        expect(getRootKeyFromName("Organ 60 C3")).toBe(48);
    });
});
