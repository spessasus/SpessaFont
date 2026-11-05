import type { GeneratorType } from "spessasynth_core";
import type { GeneratorUnit } from "./generator_unit.ts";

/**
 * One row of the generator table: which generator it edits and how its value is shown.
 */
export interface GeneratorRowType {
    generator: GeneratorType;
    fromGenerator?: (v: number) => number;
    toGenerator?: (v: number) => number;
    highlight?: boolean;
    unit?: GeneratorUnit;
    precision?: number;
}

/**
 * The conversion of a row that shows the stored value as it is.
 */
export const identity = (v: number) => v;
