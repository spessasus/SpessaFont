import { describe, expect, it } from "vitest";
import { GeneratorTypes } from "spessasynth_core";
import { INSTRUMENT_ROWS } from "../instrument_editor/instrument_rows.ts";
import { PRESET_ROWS } from "../preset_editor/preset_rows.ts";
import {
    GENERATOR_GROUP_ORDER,
    GROUP_GENERATORS,
    GROUP_OF_GENERATOR,
    isGeneratorGroup
} from "./generator_groups.ts";

describe("generator groups", () => {
    it("gives every preset and instrument row a group", () => {
        for (const { generator } of [...PRESET_ROWS, ...INSTRUMENT_ROWS]) {
            expect(GROUP_OF_GENERATOR.has(generator)).toBe(true);
        }
        const used = new Set(
            INSTRUMENT_ROWS.map((r) => GROUP_OF_GENERATOR.get(r.generator))
        );
        expect(used.size).toBe(10);
    });

    it("lists each group once, in order", () => {
        expect(GENERATOR_GROUP_ORDER).toEqual([
            "rangeTuning",
            "volume",
            "filter",
            "volumeEnvelope",
            "modulationEnvelope",
            "modulationEnvelope2",
            "modulationLFO",
            "vibratoLFO",
            "effects",
            "sample"
        ]);
        expect(GROUP_OF_GENERATOR.get(GeneratorTypes.scaleTuning)).toBe(
            "rangeTuning"
        );
        expect(GROUP_OF_GENERATOR.get(GeneratorTypes.pan)).toBe("volume");
        expect(GROUP_OF_GENERATOR.get(GeneratorTypes.modEnv2ToPitch)).toBe(
            "modulationEnvelope2"
        );
        expect(GROUP_OF_GENERATOR.get(GeneratorTypes.vibLfoWaveform)).toBe(
            "vibratoLFO"
        );
        expect(GROUP_OF_GENERATOR.get(GeneratorTypes.ignoreNoteOff)).toBe(
            "effects"
        );
        expect(GROUP_OF_GENERATOR.get(GeneratorTypes.exclusiveClass)).toBe(
            "sample"
        );
    });

    it("lists no generator in two groups", () => {
        expect(GROUP_OF_GENERATOR.size).toBe(
            Object.values(GROUP_GENERATORS).flat().length
        );
    });

    it("recognizes group names", () => {
        expect(isGeneratorGroup("volume")).toBe(true);
        expect(isGeneratorGroup("bogus")).toBe(false);
    });
});
