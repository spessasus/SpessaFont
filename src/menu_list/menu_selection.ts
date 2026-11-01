import type { BankEditView, BankEntity } from "../core_backend/bank_view.ts";

/**
 * Elements selected with Shift or Ctrl while `anchor` was the shown element.
 * It only applies while the anchor stays shown, so any other way of changing the view
 * (a click, undo, a focus hint) falls back to selecting just the shown element.
 */
export interface MultiSelection {
    readonly anchor: BankEntity;
    readonly items: ReadonlySet<BankEntity>;
}

const EMPTY = new Set<never>();

/**
 * The selected elements: the multi selection made for this view, or the shown element.
 */
export function getSelection(
    view: BankEditView,
    multi: MultiSelection | null
): ReadonlySet<BankEntity> {
    if (view === "info") {
        return EMPTY;
    }
    return multi?.anchor === view ? multi.items : new Set([view]);
}

/**
 * The selected elements of one kind.
 */
export function selectionOf<T extends BankEntity>(
    selection: ReadonlySet<BankEntity>,
    isKind: (entity: BankEntity) => entity is T
): ReadonlySet<T> {
    const result = new Set<T>();
    for (const entity of selection) {
        if (isKind(entity)) {
            result.add(entity);
        }
    }
    return result;
}

export interface ClickModifiers {
    shiftKey: boolean;
    ctrlKey: boolean;
}

export type ClickResult<T extends BankEntity> =
    { type: "show"; entity: T } | { type: "select"; selection: MultiSelection };

/**
 * What a click on a list item does. Shift selects the range from the shown element and Ctrl
 * toggles the item, both only when the shown element is in the same list.
 * Otherwise the clicked element is shown.
 */
export function getClickResult<T extends BankEntity>(
    items: readonly T[],
    clicked: T,
    view: BankEditView,
    selected: ReadonlySet<T>,
    { shiftKey, ctrlKey }: ClickModifiers
): ClickResult<T> {
    const viewIndex = view === "info" ? -1 : items.indexOf(view as T);
    if (viewIndex === -1 || view === "info" || !(shiftKey || ctrlKey)) {
        return { type: "show", entity: clicked };
    }
    if (shiftKey) {
        const clickedIndex = items.indexOf(clicked);
        const start = Math.min(viewIndex, clickedIndex);
        const end = Math.max(viewIndex, clickedIndex);
        return {
            type: "select",
            selection: {
                anchor: view,
                items: new Set(items.slice(start, end + 1))
            }
        };
    }
    const next = new Set<BankEntity>(selected);
    if (selected.has(clicked)) {
        next.delete(clicked);
    } else {
        next.add(clicked);
    }
    return { type: "select", selection: { anchor: view, items: next } };
}
