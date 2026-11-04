import { describe, expect, it } from "vitest";
import { GeneratorLimits } from "spessasynth_core";
import { parseGeneratorText } from "./parse_generator_text.ts";
import { INSTRUMENT_ROWS } from "../../instrument_editor/instrument_rows.ts";
import { PRESET_ROWS } from "../../preset_editor/preset_rows.ts";
import { s2tc, hz2ac } from "../../utils/conversion_helpers.ts";

describe("parseGeneratorText", () => {
    it("rejects a negative time or frequency instead of storing NaN", () => {
        expect(parseGeneratorText(-1, s2tc, -12_000, 8000)).toBeUndefined();
        expect(parseGeneratorText(-100, hz2ac, 1500, 13_500)).toBeUndefined();
    });

    it("clamps zero seconds to the minimum", () => {
        expect(parseGeneratorText(0, s2tc, -12_000, 8000)).toBe(-12_000);
    });

    it("gives back every value a linear row shows", () => {
        for (const row of [...INSTRUMENT_ROWS, ...PRESET_ROWS]) {
            const { fromGenerator, toGenerator, precision = 0 } = row;
            // Logarithmic rows (seconds, Hz) round their text and cannot round-trip every value
            if (!fromGenerator || !toGenerator || row.unit === "sec") {
                continue;
            }
            if (row.unit === "Hz" && fromGenerator(0) !== 0) {
                continue;
            }
            const { min, max } = GeneratorLimits[row.generator];
            for (let value = min; value <= max; value++) {
                const shown = Number(fromGenerator(value).toFixed(precision));
                expect(
                    parseGeneratorText(shown, toGenerator, min, max),
                    `generator ${row.generator} value ${value}`
                ).toBe(value);
            }
        }
    });

    it("keeps the shown filter cutoff when it is typed back", () => {
        // 1549 absolute cents shows as 20 Hz, flooring stored 1548
        expect(parseGeneratorText(20, hz2ac, 1500, 13_500)).toBe(1549);
    });
});
