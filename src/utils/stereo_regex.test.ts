import { describe, expect, it } from "vitest";
import { getStereoBaseName } from "./stereo_regex.ts";

describe("getStereoBaseName", () => {
    it("removes one stereo suffix that both halves share", () => {
        expect(getStereoBaseName("Piano L", "Piano R")).toBe("Piano");
        expect(getStereoBaseName("Bell (R)", "Bell (L)")).toBe("Bell");
        expect(getStereoBaseName("Str_l", "Str_r")).toBe("Str");
    });

    it("keeps names that do not end in a stereo suffix", () => {
        expect(getStereoBaseName("Bell", "Bell")).toBe("Bell");
        expect(getStereoBaseName("Bell", "Other")).toBe("Bell");
    });
});
