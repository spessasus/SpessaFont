import type { ZoneView } from "../../core_backend/entity_views.ts";
import type { ZoneColumn } from "../zone_columns.ts";
import {
    type CellContext,
    getCellDisplay,
    readViewCell
} from "../cell/cell_values.ts";

export type CellEditMode = "set" | "add" | "multiply";

const RELATIVE_PREFIX = /^[+xX*]/;

/**
 * The text the cell parser understands for a mode and what was typed, or undefined when there
 * is nothing to send. Set and abc text go as typed, Add and Multiply drop one typed prefix
 * (from a hardware keyboard) and add their own.
 */
export function buildCellText(
    mode: CellEditMode,
    typed: string,
    isTextMode: boolean
) {
    const trimmed = typed.trim();
    if (trimmed === "") {
        return undefined;
    }
    if (isTextMode || mode === "set") {
        return trimmed;
    }
    const rest = trimmed.replace(RELATIVE_PREFIX, "").trim();
    if (rest === "") {
        return undefined;
    }
    return (mode === "add" ? "+" : "x") + rest;
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
