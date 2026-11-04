import type { KeyboardEvent } from "react";

/**
 * The visual column a cell starts in. Merged cells (a stereo pair) span two columns, while
 * the pan row has a cell per zone, so the DOM index of a cell is not its column.
 */
function getColumn(cell: Element) {
    let column = 0;
    for (let c = cell.previousElementSibling; c; c = c.previousElementSibling) {
        column += c instanceof HTMLTableCellElement ? c.colSpan : 1;
    }
    return column;
}

/**
 * The cell of the row that covers the visual column.
 */
function getCellAt(row: Element, column: number) {
    let start = 0;
    for (const cell of row.children) {
        const span = cell instanceof HTMLTableCellElement ? cell.colSpan : 1;
        if (column < start + span) {
            return cell;
        }
        start += span;
    }
    return undefined;
}

/**
 * Moves the focus between the inputs and selects of the generator table with the arrow keys.
 * The first cell of each row is the row header, so it is skipped.
 * Up and down keep only to inputs, as a select uses them to pick a value.
 */
export function moveTableFocus(e: KeyboardEvent<HTMLTableElement>) {
    const field = e.target;
    const isInput = field instanceof HTMLInputElement;
    if (!isInput && !(field instanceof HTMLSelectElement)) {
        return;
    }
    if (!isInput && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        return;
    }
    const cell = field.closest("td, th");
    const row = cell?.parentElement;
    const section = row?.parentElement;
    if (!section || !cell || !row) {
        return;
    }
    const rows = [...section.children];
    const rowIndex = rows.indexOf(row);
    let target: Element | undefined;
    switch (e.key) {
        case "ArrowUp": {
            target = rows[rowIndex - 1];
            break;
        }
        case "ArrowDown": {
            target = rows[rowIndex + 1];
            break;
        }
        case "ArrowLeft": {
            const previous = cell.previousElementSibling;
            // Not into the row header
            target =
                previous && previous !== row.firstElementChild
                    ? previous
                    : undefined;
            break;
        }
        case "ArrowRight": {
            target = cell.nextElementSibling ?? undefined;
            break;
        }
        default: {
            return;
        }
    }
    e.preventDefault();
    const targetCell =
        e.key === "ArrowUp" || e.key === "ArrowDown"
            ? target && getCellAt(target, getColumn(cell))
            : target;
    targetCell?.querySelector<HTMLElement>("input, select")?.focus();
}
