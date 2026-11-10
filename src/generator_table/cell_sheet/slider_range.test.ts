import { describe, expect, it } from "vitest";
import { GeneratorTypes } from "spessasynth_core";
import { INSTRUMENT_ROWS } from "../../instrument_editor/instrument_rows.ts";
import { PRESET_ROWS } from "../../preset_editor/preset_rows.ts";
import { getGeneratorRange } from "../generator_range.ts";
import { getSliderRange } from "./slider_range.ts";

function getRow(rows: typeof INSTRUMENT_ROWS, generator: number) {
    const row = rows.find((r) => r.generator === generator);
    if (!row) {
        throw new Error(`No row for ${generator}.`);
    }
    return row;
}

describe("getSliderRange", () => {
    it("uses the generator range in generator units", () => {
        const instrumentRow = getRow(
            INSTRUMENT_ROWS,
            GeneratorTypes.initialAttenuation
        );
        expect(getSliderRange(instrumentRow, true)).toEqual({
            min: 0,
            max: 1440
        });
        const presetRow = getRow(
            PRESET_ROWS,
            GeneratorTypes.initialAttenuation
        );
        expect(getSliderRange(presetRow, false)).toEqual(
            getGeneratorRange(GeneratorTypes.initialAttenuation, false)
        );
    });

    it("keeps exponential rows on their generator scale", () => {
        expect(
            getSliderRange(
                getRow(INSTRUMENT_ROWS, GeneratorTypes.attackVolEnv),
                true
            )
        ).toEqual({ min: -12_000, max: 8000 });
        expect(
            getSliderRange(
                getRow(INSTRUMENT_ROWS, GeneratorTypes.initialFilterFc),
                true
            )
        ).toEqual({ min: 1500, max: 13_500 });
    });

    it("has no slider for range, option and offset rows", () => {
        for (const generator of [
            GeneratorTypes.keyRange,
            GeneratorTypes.sampleModes,
            GeneratorTypes.startAddrsOffset
        ]) {
            expect(
                getSliderRange(getRow(INSTRUMENT_ROWS, generator), true)
            ).toBeUndefined();
        }
    });
});
