import { describe, expect, it } from "vitest";
import { BasicPreset, BasicSoundBank } from "spessasynth_core";
import { presetSorter } from "./preset_sorter.ts";
import { nameSorter } from "./name_sorter.ts";

function preset(
    name: string,
    program: number,
    bankMSB = 0,
    bankLSB = 0,
    isDrum = false
) {
    const p = new BasicPreset(new BasicSoundBank());
    p.name = name;
    p.program = program;
    p.bankMSB = bankMSB;
    p.bankLSB = bankLSB;
    p.isGMGSDrum = isDrum;
    return p;
}

describe("presetSorter", () => {
    it("orders by program, then bank MSB, then bank LSB, with drums last", () => {
        const presets = [
            preset("drums", 0, 0, 0, true),
            preset("bank 1:1", 5, 1, 1),
            preset("program 10", 10),
            preset("bank 1:0", 5, 1, 0),
            preset("bank 0", 5)
        ];

        expect(
            presets
                .slice()
                .sort(presetSorter)
                .map((p) => p.name)
        ).toEqual(["bank 0", "bank 1:0", "bank 1:1", "program 10", "drums"]);
    });

    it("orders drum presets by program", () => {
        const presets = [
            preset("drums 8", 8, 0, 0, true),
            preset("drums 0", 0, 0, 0, true)
        ];

        expect(
            presets
                .slice()
                .sort(presetSorter)
                .map((p) => p.name)
        ).toEqual(["drums 0", "drums 8"]);
    });
});

describe("nameSorter", () => {
    it("compares UTF-16 code units, so uppercase sorts before lowercase", () => {
        const items = ["b", "B", "a", "A", "a"].map((name) => ({ name }));

        expect(
            items
                .slice()
                .sort(nameSorter)
                .map((i) => i.name)
        ).toEqual(["A", "B", "a", "a", "b"]);
    });
});
