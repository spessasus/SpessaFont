import type { GeneratorType } from "spessasynth_core";
import type { HistoryAction } from "../../core_backend/history.ts";
import type { ZoneColumn } from "../zone_columns.ts";
import {
    applyTextToCell,
    type CellContext,
    type CellValue,
    createCellEditActions,
    createSetCellActions
} from "./cell_values.ts";

/**
 * Copied generator cells: the raw values of one row, in table order, and the text that went to
 * the system clipboard with them, which tells a later paste that the copy is still current.
 */
export interface CellCopy {
    readonly generator: GeneratorType;
    /**
     * Raw values mean other things in a preset (offsets added to the instrument).
     */
    readonly isInstrument: boolean;
    readonly values: readonly CellValue[];
    readonly text: string;
}

/**
 * Which value goes to which column, as pairs of a column index and a value index.
 * One value goes to every target. Several values and one target fill that column and the
 * ones to its right, dropping what does not fit. Otherwise the values go to the targets in
 * order, repeating when there are more targets than values.
 * @param valueCount how many values were copied
 * @param targets the indexes of the target columns, in table order
 * @param columnCount how many columns the row has
 */
export function planPaste(
    valueCount: number,
    targets: readonly number[],
    columnCount: number
): [number, number][] {
    if (valueCount === 0) {
        return [];
    }
    if (targets.length === 1 && valueCount > 1) {
        const [start] = targets;
        const count = Math.min(valueCount, columnCount - start);
        return Array.from({ length: count }, (_, i) => [start + i, i]);
    }
    return targets.map((column, i) => [column, i % valueCount]);
}

/**
 * Splits pasted text into cell texts: on tabs and line breaks, as a spreadsheet copies them.
 * Not on commas, which are decimal points in many languages. A trailing line break
 * (spreadsheets add one) is not an empty cell.
 */
export function splitClipboardText(text: string) {
    return text.replace(/\r?\n$/, "").split(/\t|\r?\n/);
}

/**
 * What a paste into a row does: the actions, or why it does nothing.
 */
export type CellPastePlan =
    | { kind: "actions"; actions: HistoryAction[] }
    | { kind: "otherTable" }
    | { kind: "invalid"; text: string };

/**
 * Plans a paste of the cells copied in the app, or of the text when it is something else
 * (copied in another program, after the cell copy, or from another row, then read in this
 * row's units). Cells copied in a preset do not paste into an instrument or the other way
 * around, as a preset's values are offsets. Text that does not fit a cell pastes nothing.
 * @param context the element and row
 * @param columns the row's columns, in table order
 * @param targets the indexes of the target columns
 * @param text the system clipboard's text, undefined when it could not be read
 * @param cells the cells copied in the app
 */
export function planCellPaste(
    context: CellContext,
    columns: readonly ZoneColumn[],
    targets: readonly number[],
    text: string | undefined,
    cells: CellCopy | undefined
): CellPastePlan {
    // An image or files on the clipboard give no text, which must not clear the cells
    if (text?.trim() === "") {
        return { kind: "actions", actions: [] };
    }
    const isCellCopy =
        cells !== undefined && (text === undefined || text === cells.text);
    if (isCellCopy && cells.isInstrument !== context.isInstrument) {
        return { kind: "otherTable" };
    }
    if (isCellCopy && cells.generator === context.row.generator) {
        return {
            kind: "actions",
            actions: planPaste(
                cells.values.length,
                targets,
                columns.length
            ).flatMap(([c, v]) =>
                createSetCellActions(context, columns[c], cells.values[v])
            )
        };
    }
    const pasted = text ?? cells?.text;
    if (pasted === undefined) {
        return { kind: "actions", actions: [] };
    }
    const parts = splitClipboardText(pasted);
    const actions = new Array<HistoryAction>();
    for (const [c, v] of planPaste(parts.length, targets, columns.length)) {
        const cellActions = createCellEditActions(
            context,
            columns[c],
            (_current, base) => applyTextToCell(context, base, parts[v])
        );
        if (!cellActions) {
            return { kind: "invalid", text: parts[v] };
        }
        actions.push(...cellActions);
    }
    return { kind: "actions", actions };
}
