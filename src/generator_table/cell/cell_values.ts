import {
    type BasicInstrument,
    type BasicPreset,
    type BasicZone,
    type GeneratorType,
    GeneratorTypes,
    type GenericRange
} from "spessasynth_core";
import type { HistoryAction } from "../../core_backend/history.ts";
import type { SampleView, ZoneView } from "../../core_backend/entity_views.ts";
import { midiNoteToPitchClass } from "../../utils/note_name.ts";
import { type GeneratorRowType, identity } from "../generator_row_type.ts";
import {
    getViewGenerator,
    getViewZones,
    type ZoneColumn
} from "../zone_columns.ts";
import { type ColumnZone, getColumnZones } from "./column_zones.ts";
import { SetGeneratorAction } from "./set_generator_action.ts";
import { SetRangeAction } from "./set_range_action.ts";
import { isRangeGenerator } from "./range_generator.ts";
import {
    COARSE_OFFSET_SIZE,
    getCoarseOffsetGenerator,
    isOffsetGenerator,
    type OffsetGenerator
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
 * Reads "60" or "60-72" (either way around), and "" as an unset range. Returns undefined for
 * text that is not a range.
 */
export function parseRange(text: string): GenericRange | undefined {
    const trimmed = text.trim();
    if (trimmed === "") {
        return { min: -1, max: 127 };
    }
    const match = /^(\d+)\s*(?:-\s*(\d+))?$/.exec(trimmed);
    if (!match) {
        return undefined;
    }
    const first = clampMIDI(Number(match[1]));
    const second = match[2] === undefined ? first : clampMIDI(Number(match[2]));
    return { min: Math.min(first, second), max: Math.max(first, second) };
}

/**
 * A range after a typed edit: "+12" or "+-12" moves both ends by that many keys, so several
 * selected zones keep their spread, anything else is read with `parseRange`. An unset range
 * (the whole keyboard) moves like 0-127. Undefined for text that means nothing.
 */
export function applyTextToRange(text: string, current: GenericRange) {
    const trimmed = text.trim();
    if (!trimmed.startsWith("+")) {
        return parseRange(trimmed);
    }
    const match = /^\+\s*(-?\d+)$/.exec(trimmed);
    if (!match) {
        return undefined;
    }
    const shift = Number(match[1]);
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
 * The value of a number generator after an edit, see `applyTextToNumber`. An unset value
 * (null) changes from the default.
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
export function readZoneCell(
    zone: BasicZone,
    generator: GeneratorType
): CellValue {
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
 * The value a zone view stores for the row's generator. For rendering.
 */
export function readViewCell(
    zone: ZoneView,
    generator: GeneratorType
): CellValue {
    if (isRangeGenerator(generator)) {
        const range =
            generator === GeneratorTypes.keyRange
                ? zone.keyRange
                : zone.velocityRange;
        return range ? { min: range.min, max: range.max } : null;
    }
    if (isOffsetGenerator(generator)) {
        const fine = getViewGenerator(zone, generator);
        const coarse = getViewGenerator(
            zone,
            getCoarseOffsetGenerator(generator)
        );
        return fine === null && coarse === null
            ? null
            : (fine ?? 0) + (coarse ?? 0) * COARSE_OFFSET_SIZE;
    }
    return getViewGenerator(zone, generator);
}

/**
 * The value an unset cell plays with. A zone takes what the global zone sets, and the default
 * otherwise (nothing for presets, as a preset only adds to the instrument). An unset root key
 * plays the sample's own key, and an unset range or offset changes nothing.
 * @param context the element and row
 * @param isGlobal whether the cell is in the global zone, which inherits nothing
 * @param globalValue what the global zone stores
 * @param sample the zone's sample
 */
function inheritCell(
    { row, isInstrument }: CellContext,
    isGlobal: boolean,
    globalValue: CellValue,
    sample: SampleView | undefined
) {
    const { generator } = row;
    const inherited = isGlobal ? null : globalValue;
    if (isRangeGenerator(generator) || isOffsetGenerator(generator)) {
        return inherited;
    }
    if (typeof inherited === "object" && inherited !== null) {
        return null;
    }
    if (
        generator === GeneratorTypes.overridingRootKey &&
        (inherited ?? -1) === -1
    ) {
        return sample?.originalKey ?? -1;
    }
    return inherited ?? getGeneratorDefault(generator, isInstrument);
}

/**
 * What an unset cell of a zone view plays with, see `inheritCell`. For rendering.
 */
export function getInheritedViewCell(
    context: CellContext,
    globalZone: ZoneView,
    zone: ZoneView,
    sample: SampleView | undefined
) {
    return inheritCell(
        context,
        zone.id === globalZone.id,
        readViewCell(globalZone, context.row.generator),
        sample
    );
}

/**
 * What an unset cell of a zone plays with, see `inheritCell`. For handlers.
 */
function getInheritedZoneCell(
    context: CellContext,
    { zone, sample }: ColumnZone
) {
    const { globalZone } = context.element;
    return inheritCell(
        context,
        zone === globalZone,
        readZoneCell(globalZone, context.row.generator),
        sample
    );
}

/**
 * The value of a column, read from the element: the first zone's, so a copy of a stereo
 * column takes the left (or first) zone. For handlers.
 */
export function readColumnCell(
    element: BasicPreset | BasicInstrument,
    column: ZoneColumn,
    generator: GeneratorType
) {
    const [first] = getColumnZones(element, column);
    return first ? readZoneCell(first.zone, generator) : null;
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
 * The largest offset the coarse generator (16 bits) can store with the fine one.
 */
const MAX_OFFSET = 32_767 * COARSE_OFFSET_SIZE + 32_767;

/**
 * The offsets a zone can take: within its sample, and never before the sample's start, which
 * the synthesizer would not play. A zone without a sample (the global zone) is only limited by
 * what the generators store.
 */
export function getOffsetLimits(
    generator: OffsetGenerator,
    sample: SampleView | undefined
) {
    const limit = sample ? Math.max(0, sample.length - 1) : MAX_OFFSET;
    return {
        min: generator === GeneratorTypes.startAddrsOffset ? 0 : -limit,
        max: limit
    };
}

/**
 * The value a zone takes, clamped to what its row allows, or undefined when the value does
 * not fit the row.
 */
function fitZoneValue(
    { row, isInstrument }: CellContext,
    sample: SampleView | undefined,
    value: CellValue
) {
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
        const { min, max } = getOffsetLimits(generator, sample);
        return clamp(Math.round(value), min, max);
    }
    const { min, max } = getGeneratorRange(generator, isInstrument);
    return clamp(Math.round(value), min, max);
}

/**
 * The actions that store a value in one zone, none when it holds the value already.
 */
function createZoneActions(
    { element, row }: CellContext,
    zone: BasicZone,
    value: CellValue
) {
    const { generator } = row;
    if (isSameCell(readZoneCell(zone, generator), value)) {
        return [];
    }
    if (isRangeGenerator(generator)) {
        const range =
            value !== null && typeof value === "object"
                ? value
                : { min: -1, max: 127 };
        const current =
            generator === GeneratorTypes.keyRange
                ? zone.keyRange
                : zone.velRange;
        return [new SetRangeAction(element, zone, generator, current, range)];
    }
    if (typeof value === "object" && value !== null) {
        return [];
    }
    if (isOffsetGenerator(generator)) {
        const coarseGenerator = getCoarseOffsetGenerator(generator);
        const fine = value === null ? null : value % COARSE_OFFSET_SIZE;
        const coarse =
            value === null
                ? null
                : Math.trunc(value / COARSE_OFFSET_SIZE) || null;
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
            value
        )
    ];
}

/**
 * Works out a zone's new value from its own: the stored value, or null when unset, and the
 * value it plays with (the inherited one when unset). Undefined when the edit means nothing.
 */
export type CellEditor = (
    current: CellValue,
    base: CellValue
) => CellValue | undefined;

/**
 * The actions that apply an edit to each zone of a column (both of a stereo pair), each zone
 * from its own value, so a relative edit keeps the difference between the left and right
 * zone. Values are clamped to the row. Undefined when the edit means nothing for a zone.
 */
export function createCellEditActions(
    context: CellContext,
    column: ZoneColumn,
    edit: CellEditor
) {
    const actions = new Array<HistoryAction>();
    for (const columnZone of getColumnZones(context.element, column)) {
        const current = readZoneCell(columnZone.zone, context.row.generator);
        const next = edit(
            current,
            current ?? getInheritedZoneCell(context, columnZone)
        );
        const fitted =
            next === undefined
                ? undefined
                : fitZoneValue(context, columnZone.sample, next);
        if (fitted === undefined) {
            return undefined;
        }
        actions.push(...createZoneActions(context, columnZone.zone, fitted));
    }
    return actions;
}

/**
 * The actions that store one value in a column (both zones of a stereo column). Values that
 * do not fit the row are skipped, and so are zones that hold the value already.
 */
export function createSetCellActions(
    context: CellContext,
    column: ZoneColumn,
    value: CellValue
) {
    return createCellEditActions(context, column, () => value) ?? [];
}

/**
 * The value a typed or pasted text gives a zone: "" clears it, a range row reads ranges and
 * "+12" shifts, other rows read numbers, "+3" and "x2" from the zone's own value (or the one it
 * inherits). Undefined for text that does not fit the row.
 */
export function applyTextToCell(
    context: CellContext,
    base: CellValue,
    text: string
): CellValue | undefined {
    const { generator } = context.row;
    if (text.trim() === "") {
        return null;
    }
    if (isRangeGenerator(generator)) {
        const range = applyTextToRange(
            text,
            typeof base === "object" && base !== null
                ? base
                : { min: -1, max: 127 }
        );
        return range?.min === -1 ? null : range;
    }
    if (typeof base === "object" && base !== null) {
        return undefined;
    }
    if (isOffsetGenerator(generator)) {
        const edit = parseCellText(text);
        return edit ? Math.round(applyCellEdit(edit, base ?? 0)) : undefined;
    }
    return applyTextToNumber(context, base, text);
}

/**
 * The actions for a text typed into (or pasted into) cells, each from its own value.
 * Undefined when the text does not fit one of them, so nothing changes.
 */
export function createTextEditActions(
    context: CellContext,
    columns: readonly ZoneColumn[],
    text: string
) {
    const actions = new Array<HistoryAction>();
    for (const column of columns) {
        const columnActions = createCellEditActions(
            context,
            column,
            (_current, base) => applyTextToCell(context, base, text)
        );
        if (!columnActions) {
            return undefined;
        }
        actions.push(...columnActions);
    }
    return actions;
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
 * The value after one or more wheel notches. Unset cells start from what they play with (the
 * inherited value). A select row picks the next or previous option, a range moves its low
 * bound. Offsets are clamped later, to the zone's sample.
 * @param context the element and row
 * @param current what the zone stores, null when unset
 * @param base what the zone plays with
 * @param direction up or down
 * @param steps how many notches
 */
export function nudgeCellValue(
    context: CellContext,
    current: CellValue,
    base: CellValue,
    direction: 1 | -1,
    steps: number
): CellValue {
    const { row, isInstrument } = context;
    const { generator } = row;
    if (isRangeGenerator(generator)) {
        const range =
            typeof base === "object" && base !== null
                ? base
                : { min: 0, max: 127 };
        const min = clampMIDI(range.min + direction * steps);
        return { min, max: Math.max(min, range.max) };
    }
    if (
        (base !== null && typeof base === "object") ||
        (current !== null && typeof current === "object")
    ) {
        return current;
    }
    if (isOffsetGenerator(generator)) {
        return (base ?? 0) + direction * steps;
    }
    const options = getGeneratorOptions(generator);
    if (options) {
        // "-" (unset) is an option of its own
        const values: (number | null)[] = [
            null,
            ...options.map((o) => o.value)
        ];
        const index = values.indexOf(current);
        return values[clamp(index + direction * steps, 0, values.length - 1)];
    }
    const { min, max } = getGeneratorRange(generator, isInstrument);
    let raw = base ?? getGeneratorDefault(generator, isInstrument);
    for (let i = 0; i < steps; i++) {
        raw = stepNumber(row, raw, direction, min, max);
    }
    return raw;
}

/**
 * The placeholder of an unset cell: the value it plays with.
 */
function formatPlaceholder(row: GeneratorRowType, inherited: CellValue) {
    if (
        typeof inherited === "number" &&
        inherited >= 0 &&
        row.generator === GeneratorTypes.overridingRootKey
    ) {
        return `${inherited} (${midiNoteToPitchClass(inherited)})`;
    }
    const text = formatCell(row, inherited);
    return text === "-1" ? "-" : text;
}

/**
 * What a cell shows. A stereo column whose zones differ shows both values, so an edit never
 * changes a value the user did not see.
 */
export interface CellDisplay {
    text: string;
    placeholder: string;
    /**
     * The value of each zone of the column, the partner second.
     */
    values: CellValue[];
    /**
     * The text of each value, "-" for unset.
     */
    parts: string[];
    isMixed: boolean;
}

/**
 * What a cell of a column shows. For rendering.
 */
export function getCellDisplay(
    context: CellContext,
    column: ZoneColumn,
    globalZone: ZoneView
): CellDisplay {
    const { row } = context;
    const zones = getViewZones(column);
    const values = zones.map((z) => readViewCell(z, row.generator));
    const [first, second] = values;
    const isMixed = values.length > 1 && !isSameCell(first, second);
    const placeholder = formatPlaceholder(
        row,
        getInheritedViewCell(context, globalZone, column.zone, column.sample)
    );
    const parts = values.map((v) => formatCell(row, v) || "-");
    return {
        text: isMixed ? parts.join(" / ") : formatCell(row, first),
        placeholder,
        values,
        parts,
        isMixed
    };
}
