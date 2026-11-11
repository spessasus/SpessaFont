import { describe, expect, it } from "vitest";
import { GeneratorTypes } from "spessasynth_core";
import { INSTRUMENT_ROWS } from "../../instrument_editor/instrument_rows.ts";
import { PRESET_ROWS } from "../../preset_editor/preset_rows.ts";
import { getShownRows } from "./element_rows.ts";

describe("getShownRows", () => {
    it("shows every row in SFE mode", () => {
        expect(getShownRows(INSTRUMENT_ROWS, true)).toBe(INSTRUMENT_ROWS);
    });

    it("hides the SFE generators in SF2 mode and keeps the list's identity", () => {
        const shown = getShownRows(PRESET_ROWS, false);
        const generators = shown.map((r) => r.generator);
        expect(generators).toContain(GeneratorTypes.initialAttenuation);
        expect(generators).not.toContain(GeneratorTypes.amplitude);
        expect(generators).not.toContain(GeneratorTypes.delayModEnv2);
        expect(generators.every((g) => g <= GeneratorTypes.endOper)).toBe(true);
        // The table and its memoized cells rely on it
        expect(getShownRows(PRESET_ROWS, false)).toBe(shown);
    });
});
