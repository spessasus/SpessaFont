import type { GeneratorType } from "spessasynth_core";
import type { CellValue } from "./cell_values.ts";

/**
 * Copied generator cells: the raw values of one row, in table order, and the text that went to
 * the system clipboard with them, which tells a later paste that the copy is still current.
 */
export interface CellCopy {
    readonly generator: GeneratorType;
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
 * Splits pasted text into cell texts: on tabs, line breaks and commas, as a spreadsheet copies
 * them. A trailing line break (spreadsheets add one) is not an empty cell.
 */
export function splitClipboardText(text: string) {
    return text.replace(/\r?\n$/, "").split(/\t|\r?\n|,/);
}
