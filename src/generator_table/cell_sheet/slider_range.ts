import type { ZoneColumn } from "../zone_columns.ts";
import type { GeneratorRowType } from "../generator_row_type.ts";
import { getGeneratorRange } from "../generator_range.ts";
import { getGeneratorOptions } from "../generator_options.ts";
import { isRangeGenerator } from "../cell/range_generator.ts";
import { isOffsetGenerator } from "../cell/offset_generator.ts";
import { type CellContext, createSetCellActions } from "../cell/cell_values.ts";

/**
 * The slider's range for a row, in generator units with a step of 1, so exponential rows
 * (timecents, absolute cents) keep their perceptual scale. Undefined for rows without a
 * slider: key and velocity ranges, option rows, and the sample offsets, whose range is the
 * sample's length.
 */
export function getSliderRange(row: GeneratorRowType, isInstrument: boolean) {
    const { generator } = row;
    const hasSlider =
        !isRangeGenerator(generator) &&
        !isOffsetGenerator(generator) &&
        !getGeneratorOptions(generator);
    return hasSlider ? getGeneratorRange(generator, isInstrument) : undefined;
}

/**
 * The actions of a slider release: the raw value set in every checked cell, as a Set of the
 * same value would, so inheritance, stereo pairs and clamping follow the typed rules.
 */
export function createSliderActions(
    context: CellContext,
    columns: readonly ZoneColumn[],
    value: number
) {
    return columns.flatMap((column) =>
        createSetCellActions(context, column, value)
    );
}
