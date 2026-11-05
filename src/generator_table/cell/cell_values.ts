import {
    type BasicInstrument,
    type BasicPreset,
    type BasicZone,
    type GeneratorType,
    GeneratorTypes,
    type GenericRange
} from "spessasynth_core";
import type { HistoryAction } from "../../core_backend/history.ts";
import type { GeneratorRowType } from "../generator_row_type.ts";
import type { ZoneColumn } from "../zone_columns.ts";
import { getColumnZones } from "./column_zones.ts";
import { SetGeneratorAction } from "./set_generator_action.ts";
import { SetRangeAction } from "./set_range_action.ts";
import { isRangeGenerator } from "./range_generator.ts";
import {
    COARSE_OFFSET_SIZE,
    getCoarseOffsetGenerator,
    isOffsetGenerator
} from "./offset_generator.ts";
import { getGeneratorOptions } from "../generator_options.ts";
import {
    clamp,
    getGeneratorDefault,
    getGeneratorRange
} from "../generator_range.ts";
import {
    applyCellEdit,
    type CellEdit,
    parseCellText,
    parseGeneratorText
} from "./parse_generator_text.ts";

/**
 * What one cell holds, as stored: a raw generator value, a key or velocity range, or null when
 * the zone does not set it. Offsets are the fine and coarse generators added up.
 */
export type CellValue = number | GenericRange | null;

/**
 * The element and row a cell edit happens in.
 */
export interface CellContext {
    element: BasicPreset | BasicInstrument;
    row: GeneratorRowType;
    isInstrument: boolean;
}

const identity = (v: number) => v;

/**
 * The text a number cell shows for a raw value, or "" for unset.
 */
export function formatNumberCell(row: GeneratorRowType, raw: number | null) {
    const { fromGenerator = identity, precision = 0 } = row;
    return raw === null ? "" : fromGenerator(raw).toFixed(precision);
}

export function formatRange(range: GenericRange | undefined | null) {
    if (!range || range.min === -1) {
        return "";
    }
    const { min, max } = range;
    return min === max ? min.toString() : `${min}-${max}`;
}

const clampMIDI = (v: number) => clamp(v, 0, 127);

/**
 * Reads "60" or "60-72", and "" as an unset range. Returns undefined for text that is not a
 * range.
 */
export function parseRange(text: string): GenericRange | undefined {
    if (text === "") {
        return { min: -1, max: 127 };
    }
    const [minText, maxText = minText] = text.split("-", 2);
    const min = Number.parseInt(minText);
    const max = Number.parseInt(maxText);
    if (Number.isNaN(min) || Number.isNaN(max)) {
        return undefined;
    }
    const clampedMin = clampMIDI(min);
    return { min: clampedMin, max: Math.max(clampedMin, clampMIDI(max)) };
}

/**
 * A range after a typed edit: "+12" or "+-12" moves both ends by that many keys, so several
 * selected zones keep their spread, anything else is read with `parseRange`. An unset range
 * (the whole keyboard) moves like 0-127. Undefined for text that means nothing.
 */
export function applyTextToRange(text: string, current: GenericRange) {
    if (!text.startsWith("+")) {
        return parseRange(text);
    }
    const shift = Number.parseInt(text.slice(1));
    if (Number.isNaN(shift)) {
        return undefined;
    }
    const from = current.min === -1 ? { min: 0, max: 127 } : current;
    return {
        min: clampMIDI(from.min + shift),
        max: clampMIDI(from.max + shift)
    };
}

/**
 * The value of a number generator after a typed edit ("5", "+3", "x0.5"), worked out from what
 * the cell shows, so the result matches what the user sees. Undefined when the text means
 * nothing or has no generator value.
 */
export function applyTextToNumber(
    context: CellContext,
    raw: number | null,
    text: string
) {
    const edit = parseCellText(text);
    return edit ? applyEditToNumber(context, raw, edit) : undefined;
}

/**
 * The value of a number generator after an edit, see `applyTextToNumber`.
 */
export function applyEditToNumber(
    { row, isInstrument }: CellContext,
    raw: number | null,
    edit: CellEdit
) {
    const { generator, toGenerator = identity } = row;
    const current = raw ?? getGeneratorDefault(generator, isInstrument);
    const shown = Number(formatNumberCell(row, current));
    const { min, max } = getGeneratorRange(generator, isInstrument);
    return parseGeneratorText(
        applyCellEdit(edit, shown),
        toGenerator,
        min,
        max
    );
}

/**
 * The value a zone stores for the row's generator.
 */
export function readZoneCell(zone: BasicZone, generator: GeneratorType) {
    if (isRangeGenerator(generator)) {
        const range =
            generator === GeneratorTypes.keyRange
                ? zone.keyRange
                : zone.velRange;
        return range.min === -1 ? null : { ...range };
    }
    if (isOffsetGenerator(generator)) {
        const fine = zone.getGenerator(generator, null);
        const coarse = zone.getGenerator(
            getCoarseOffsetGenerator(generator),
            null
        );
        return fine === null && coarse === null
            ? null
            : (fine ?? 0) + (coarse ?? 0) * COARSE_OFFSET_SIZE;
    }
    return zone.getGenerator(generator, null);
}

/**
 * The value of a column, read from the element. For handlers.
 */
export function readColumnCell(
    element: BasicPreset | BasicInstrument,
    column: ZoneColumn,
    generator: GeneratorType
) {
    const [zone] = getColumnZones(element, column);
    return zone ? readZoneCell(zone, generator) : null;
}

export function formatCell(row: GeneratorRowType, value: CellValue) {
    if (value !== null && typeof value === "object") {
        return formatRange(value);
    }
    if (isOffsetGenerator(row.generator)) {
        return value === null ? "" : value.toString();
    }
    return formatNumberCell(row, value);
}

export function isSameCell(a: CellValue, b: CellValue) {
    return a !== null && b !== null && typeof a === "object"
        ? typeof b === "object" && a.min === b.min && a.max === b.max
        : a === b;
}

/**
 * The value a column takes from a copied value, clamped to what its row allows,
 * or undefined when the value does not fit the row.
 */
function fitCellValue(
    { row, isInstrument }: CellContext,
    column: ZoneColumn,
    value: CellValue
): CellValue | undefined {
    const { generator } = row;
    if (isRangeGenerator(generator)) {
        if (value === null) {
            return null;
        }
        if (typeof value !== "object") {
            return undefined;
        }
        const min = clampMIDI(value.min);
        return { min, max: Math.max(min, clampMIDI(value.max)) };
    }
    if (value !== null && typeof value === "object") {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    if (isOffsetGenerator(generator)) {
        // An offset cannot move past the whole sample
        const limit = column.sample ? column.sample.length - 1 : Infinity;
        return clamp(Math.round(value), -limit, limit);
    }
    const { min, max } = getGeneratorRange(generator, isInstrument);
    return clamp(Math.round(value), min, max);
}

/**
 * The actions that store a value in a column (both zones of a stereo column). Values that do
 * not fit the row are skipped, and so are zones that hold the value already.
 */
export function createSetCellActions(
    context: CellContext,
    column: ZoneColumn,
    value: CellValue
) {
    const { element, row } = context;
    const { generator } = row;
    const fitted = fitCellValue(context, column, value);
    if (fitted === undefined) {
        return [];
    }
    return getColumnZones(element, column).flatMap((zone): HistoryAction[] => {
        if (isSameCell(readZoneCell(zone, generator), fitted)) {
            return [];
        }
        if (isRangeGenerator(generator)) {
            const range =
                fitted !== null && typeof fitted === "object"
                    ? fitted
                    : { min: -1, max: 127 };
            const current =
                generator === GeneratorTypes.keyRange
                    ? zone.keyRange
                    : zone.velRange;
            return [
                new SetRangeAction(element, zone, generator, current, range)
            ];
        }
        if (typeof fitted === "object" && fitted !== null) {
            return [];
        }
        if (isOffsetGenerator(generator)) {
            const coarseGenerator = getCoarseOffsetGenerator(generator);
            const fine = fitted === null ? null : fitted % COARSE_OFFSET_SIZE;
            const coarse =
                fitted === null
                    ? null
                    : Math.trunc(fitted / COARSE_OFFSET_SIZE) || null;
            return [
                new SetGeneratorAction(
                    element,
                    zone,
                    generator,
                    zone.getGenerator(generator, null),
                    fine
                ),
                new SetGeneratorAction(
                    element,
                    zone,
                    coarseGenerator,
                    zone.getGenerator(coarseGenerator, null),
                    coarse
                )
            ];
        }
        return [
            new SetGeneratorAction(
                element,
                zone,
                generator,
                zone.getGenerator(generator, null),
                fitted
            )
        ];
    });
}

/**
 * The value a pasted text part gives a cell, from the cell's own value for relative edits.
 * Undefined for text that does not fit the row.
 */
export function parseCellPart(
    context: CellContext,
    current: CellValue,
    text: string
): CellValue | undefined {
    const { generator } = context.row;
    const trimmed = text.trim();
    if (isRangeGenerator(generator)) {
        const range = parseRange(trimmed);
        return range?.min === -1 ? null : range;
    }
    if (trimmed === "") {
        return null;
    }
    if (isOffsetGenerator(generator)) {
        const offset = Number.parseInt(trimmed);
        return Number.isNaN(offset) ? undefined : offset;
    }
    return typeof current === "object" && current !== null
        ? undefined
        : applyTextToNumber(context, current, trimmed);
}

/**
 * The smallest change of a raw value, in the direction, that changes the text the cell shows,
 * so one wheel notch always does something visible, even on logarithmic rows.
 */
function stepNumber(
    row: GeneratorRowType,
    raw: number,
    direction: 1 | -1,
    min: number,
    max: number
) {
    const text = formatNumberCell(row, raw);
    for (let next = raw + direction; next >= min && next <= max;) {
        if (formatNumberCell(row, next) !== text) {
            return next;
        }
        next += direction;
    }
    return clamp(raw, min, max);
}

/**
 * The value after one or more wheel notches. Unset cells start from what they show (the
 * default). A select row picks the next or previous option, a range moves its low bound.
 */
export function nudgeCellValue(
    context: CellContext,
    column: ZoneColumn,
    value: CellValue,
    direction: 1 | -1,
    steps: number
): CellValue {
    const { row, isInstrument } = context;
    const { generator } = row;
    if (value !== null && typeof value === "object") {
        const min = clampMIDI(value.min + direction * steps);
        return { min, max: Math.max(min, value.max) };
    }
    if (isRangeGenerator(generator)) {
        const min = clampMIDI(direction * steps);
        return { min, max: 127 };
    }
    if (isOffsetGenerator(generator)) {
        const limit = column.sample ? column.sample.length - 1 : Infinity;
        return clamp((value ?? 0) + direction * steps, -limit, limit);
    }
    const options = getGeneratorOptions(generator);
    if (options) {
        const values: (number | null)[] = [
            null,
            ...options.map((o) => o.value)
        ];
        const index = values.indexOf(value);
        return values[clamp(index + direction * steps, 0, values.length - 1)];
    }
    const { min, max } = getGeneratorRange(generator, isInstrument);
    let raw = value ?? getGeneratorDefault(generator, isInstrument);
    for (let i = 0; i < steps; i++) {
        raw = stepNumber(row, raw, direction, min, max);
    }
    return raw;
}
