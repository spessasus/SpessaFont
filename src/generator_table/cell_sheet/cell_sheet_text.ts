import type { ZoneView } from "../../core_backend/entity_views.ts";
import type { ZoneColumn } from "../zone_columns.ts";
import {
    type CellContext,
    createTextEditActions,
    type CellValue,
    getCellDisplay,
    readViewCell
} from "../cell/cell_values.ts";

export type CellEditMode = "set" | "add" | "multiply";

const RELATIVE_PREFIX = /^[+xX*]/;

/**
 * The text the cell parser understands for a mode and what was typed, or undefined when there
 * is nothing to send. Set and abc text go as typed, Add and Multiply drop one typed prefix
 * (from a hardware keyboard) and add their own. A lone minus (the sign button on an empty
 * field) counts as empty.
 */
export function buildCellText(
    mode: CellEditMode,
    typed: string,
    isTextMode: boolean
) {
    const trimmed = typed.trim();
    if (trimmed === "" || trimmed === "-") {
        return undefined;
    }
    if (isTextMode || mode === "set") {
        return trimmed;
    }
    const rest = trimmed.replace(RELATIVE_PREFIX, "").trim();
    if (rest === "" || rest === "-") {
        return undefined;
    }
    return (mode === "add" ? "+" : "x") + rest;
}

/**
 * The actions of the sheet's Apply, each checked column from its own value. Undefined when the
 * text does not fit one of them.
 */
export function applyCellSheetText(
    context: CellContext,
    columns: readonly ZoneColumn[],
    text: string
) {
    return createTextEditActions(context, columns, text);
}

/**
 * The text for a range row, "48-69" or a shift like "+12" and "+-12".
 */
export function buildRangeText(
    edit:
        | { kind: "set"; low: number; high: number }
        | { kind: "shift"; by: number }
) {
    return edit.kind === "set" ? `${edit.low}-${edit.high}` : `+${edit.by}`;
}

/**
 * The Low and High a range editor starts with, the full keyboard for an unset range.
 */
export function getRangeFields(value: CellValue) {
    return value !== null && typeof value === "object"
        ? { low: value.min, high: value.max }
        : { low: 0, high: 127 };
}

/**
 * The Low and High the range editor starts with for the checked cells, undefined when their
 * ranges differ (the fields stay empty then, like the number field).
 */
export function getSharedRangeFields(values: readonly CellValue[]) {
    const [first, ...rest] = values.map((v) => getRangeFields(v));
    if (!first) {
        return getRangeFields(null);
    }
    return rest.every((r) => r.low === first.low && r.high === first.high)
        ? first
        : undefined;
}

/**
 * The option every value shares (null when all are unset), or undefined when they differ or
 * there are none.
 */
export function getSharedOption(values: readonly CellValue[]) {
    const [first, ...rest] = values;
    if (first === undefined || (typeof first === "object" && first !== null)) {
        return undefined;
    }
    return rest.every((v) => v === first) ? first : undefined;
}

/**
 * What the cell sheet's zone list shows for a column: its own value, both values of a stereo
 * pair that differ, or the value an unset cell plays with and where it comes from.
 */
export type SheetValue =
    | { kind: "own"; text: string }
    | { kind: "mixed"; left: string; right: string }
    | { kind: "inherited"; text: string; source: "global" | "default" };

/**
 * The zone list's value of a column. For rendering.
 */
export function describeSheetValue(
    context: CellContext,
    column: ZoneColumn,
    globalZone: ZoneView
): SheetValue {
    const display = getCellDisplay(context, column, globalZone);
    if (display.isMixed) {
        const [left, right] = display.parts;
        return { kind: "mixed", left, right };
    }
    if (display.text !== "") {
        return { kind: "own", text: display.text };
    }
    const isFromGlobal =
        column.zone.id !== globalZone.id &&
        readViewCell(globalZone, context.row.generator) !== null;
    return {
        kind: "inherited",
        text: display.placeholder,
        source: isFromGlobal ? "global" : "default"
    };
}
