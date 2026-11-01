import type { KeyboardEvent } from "react";

/**
 * Moves the focus between the inputs of the generator table with the arrow keys.
 * The first cell of each row is the row header, so it is skipped.
 */
export function moveTableFocus(e: KeyboardEvent<HTMLTableElement>) {
    const input = e.target;
    if (!(input instanceof HTMLInputElement)) {
        return;
    }
    const cell = input.closest("td, th");
    const row = cell?.parentElement;
    const section = row?.parentElement;
    if (
        !section ||
        !(cell instanceof HTMLTableCellElement) ||
        !(row instanceof HTMLTableRowElement)
    ) {
        return;
    }
    const rows = [...section.children];
    let rowIndex = rows.indexOf(row);
    let column = cell.cellIndex;
    switch (e.key) {
        case "ArrowUp": {
            rowIndex = Math.max(0, rowIndex - 1);
            break;
        }
        case "ArrowDown": {
            rowIndex = Math.min(rows.length - 1, rowIndex + 1);
            break;
        }
        case "ArrowLeft": {
            column = Math.max(1, column - 1);
            break;
        }
        case "ArrowRight": {
            column = Math.min(row.children.length - 1, column + 1);
            break;
        }
        default: {
            return;
        }
    }
    e.preventDefault();
    rows[rowIndex]?.children[column]?.querySelector("input")?.focus();
}
