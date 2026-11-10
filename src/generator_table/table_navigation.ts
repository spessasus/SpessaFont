import type { KeyboardEvent } from "react";
import type { GeneratorType } from "spessasynth_core";

/*
 * The table is one Tab stop. Its buttons and cells are items of a roving focus: the arrow keys
 * move between them, and only the last focused one is in the Tab order (tabIndex 0).
 * Each item carries its key in `data-grid-key`.
 */

const ITEM_SELECTOR = "[data-grid-key]";

export const ADD_ZONE_KEY = "add";

export function getZoneNameKey(zoneId: number) {
    return `name:${zoneId}`;
}

export function getZoneDeleteKey(zoneId: number) {
    return `delete:${zoneId}`;
}

export function getModulatorKey(zoneId: number) {
    return `modulators:${zoneId}`;
}

export function getCellKey(generator: GeneratorType, zoneId: number) {
    return `cell:${generator}:${zoneId}`;
}

/**
 * The generator and zone of a cell key, undefined for the keys of the header's buttons.
 */
export function parseCellKey(key: string) {
    const match = /^cell:(\d+):(\d+)$/.exec(key);
    return match
        ? { generator: Number(match[1]), zoneId: Number(match[2]) }
        : undefined;
}

/**
 * The table's Tab stop: the last focused item, or the first cell when that item is gone (a
 * deleted zone).
 */
export function getTabKey(
    activeKey: string | null,
    shown: {
        zoneIds: readonly number[];
        modulatorZoneIds: readonly number[];
        rows: readonly {
            generator: GeneratorType;
            zoneIds: readonly number[];
        }[];
        globalZoneId: number;
    }
) {
    const shownKeys = new Set<string>([ADD_ZONE_KEY]);
    for (const zoneId of shown.zoneIds) {
        shownKeys.add(getZoneNameKey(zoneId));
        shownKeys.add(getZoneDeleteKey(zoneId));
    }
    for (const zoneId of shown.modulatorZoneIds) {
        shownKeys.add(getModulatorKey(zoneId));
    }
    for (const { generator, zoneIds } of shown.rows) {
        for (const zoneId of zoneIds) {
            shownKeys.add(getCellKey(generator, zoneId));
        }
    }
    if (activeKey !== null && shownKeys.has(activeKey)) {
        return activeKey;
    }
    const [firstRow] = shown.rows;
    return firstRow
        ? getCellKey(firstRow.generator, shown.globalZoneId)
        : ADD_ZONE_KEY;
}

/**
 * The key of the item an event happened in.
 */
export function getGridKey(target: EventTarget | null) {
    return target instanceof Element
        ? target.closest<HTMLElement>(ITEM_SELECTOR)?.dataset.gridKey
        : undefined;
}

function getItems(container: Element | null | undefined) {
    return container
        ? [...container.querySelectorAll<HTMLElement>(ITEM_SELECTOR)]
        : [];
}

/**
 * The item with the key inside the container, if it is shown.
 */
export function findGridItem(container: Element | null, key: string) {
    return getItems(container).find((item) => item.dataset.gridKey === key);
}

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
 * The first item above or below, in the same visual column. Rows without an item there (the
 * global zone has no header buttons) are skipped.
 */
function getVerticalTarget(
    rows: readonly Element[],
    rowIndex: number,
    column: number,
    step: 1 | -1
) {
    for (let r = rowIndex + step; r >= 0 && r < rows.length; r += step) {
        const [item] = getItems(getCellAt(rows[r], column));
        if (item) {
            return item;
        }
    }
    return undefined;
}

/**
 * The parts of a key press the table reads, so tests can pass a plain object.
 */
export type TableKeyEvent = Pick<
    KeyboardEvent<HTMLTableElement>,
    | "key"
    | "target"
    | "currentTarget"
    | "ctrlKey"
    | "metaKey"
    | "altKey"
    | "shiftKey"
    | "defaultPrevented"
    | "preventDefault"
    | "stopPropagation"
>;

/**
 * Keys the table keeps from the shortcuts that listen on the document: the arrows would show
 * another element, Delete would delete it and Ctrl+C would copy it. Undo, redo and save
 * (Ctrl+Z, Ctrl+Y, Ctrl+S), the Alt shortcuts and Escape still reach them.
 */
function isTableKey(e: TableKeyEvent) {
    if (e.altKey || e.key === "Escape") {
        return false;
    }
    if (e.ctrlKey || e.metaKey) {
        return ["a", "c", "d", "v", "x", "home", "end"].includes(
            e.key.toLowerCase()
        );
    }
    return true;
}

/**
 * Moves the focus between the items of the generator table: the arrow keys, Home and End in
 * the row, Ctrl+Home and Ctrl+End to the first and last item. Never changes a value, so a
 * select reached with the arrows keeps them for moving.
 * @param e the key press, after the focused cell had its chance to handle it
 * @param onMove called with the keys of both items before the focus moves, and whether it
 * was Shift and Left or Right (which extends the cell selection)
 */
export function handleTableKeyDown(
    e: TableKeyEvent,
    onMove: (fromKey: string, toKey: string, isExtending: boolean) => void
) {
    const isOwnKey = isTableKey(e);
    const item =
        e.target instanceof Element
            ? e.target.closest<HTMLElement>(ITEM_SELECTOR)
            : null;
    const cell = item?.closest("td, th");
    const row = cell?.parentElement;
    if (!item || !cell || !row || e.defaultPrevented || e.altKey) {
        if (isOwnKey) {
            e.stopPropagation();
        }
        return;
    }
    const rows: Element[] = [...e.currentTarget.querySelectorAll("tr")];
    const rowItems = getItems(row);
    const index = rowItems.indexOf(item);
    let target: HTMLElement | undefined;
    switch (e.key) {
        case "ArrowLeft": {
            target = rowItems[index - 1];
            break;
        }
        case "ArrowRight": {
            target = rowItems[index + 1];
            break;
        }
        case "ArrowUp":
        case "ArrowDown": {
            target = getVerticalTarget(
                rows,
                rows.indexOf(row),
                getColumn(cell),
                e.key === "ArrowUp" ? -1 : 1
            );
            break;
        }
        case "Home": {
            target =
                e.ctrlKey || e.metaKey ? getItems(rows[0])[0] : rowItems[0];
            break;
        }
        case "End": {
            const items =
                e.ctrlKey || e.metaKey ? getItems(e.currentTarget) : rowItems;
            target = items[items.length - 1];
            break;
        }
        default: {
            if (isOwnKey) {
                e.stopPropagation();
            }
            return;
        }
    }
    e.preventDefault();
    e.stopPropagation();
    if (!target) {
        return;
    }
    const fromKey = item.dataset.gridKey;
    const toKey = target.dataset.gridKey;
    if (fromKey !== undefined && toKey !== undefined) {
        const isSideways = e.key === "ArrowLeft" || e.key === "ArrowRight";
        onMove(fromKey, toKey, e.shiftKey && isSideways);
    }
    target.focus();
}

/**
 * Moves the focus off a column that is about to be removed, to the same item of the next
 * column, or of the previous one (the add button when no column is left), so the focus is
 * not lost with the removed buttons.
 */
export function focusNeighborColumn(item: HTMLElement) {
    const cell = item.closest("td, th");
    if (!cell) {
        return;
    }
    const index = getItems(cell).indexOf(item);
    const pick = (neighbor: Element) => {
        const items = getItems(neighbor);
        return items[index] ?? items[items.length - 1];
    };
    for (let n = cell.nextElementSibling; n; n = n.nextElementSibling) {
        const target = pick(n);
        if (target) {
            target.focus();
            return;
        }
    }
    for (let n = cell.previousElementSibling; n; n = n.previousElementSibling) {
        const target = pick(n);
        if (target) {
            target.focus();
            return;
        }
    }
}
