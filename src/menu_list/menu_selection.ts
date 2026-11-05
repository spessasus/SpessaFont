import { BasicInstrument, BasicPreset, BasicSample } from "spessasynth_core";
import type { BankEditView, BankEntity } from "../core_backend/bank_view.ts";

export const isPreset = (e: BankEntity) => e instanceof BasicPreset;
export const isInstrument = (e: BankEntity) => e instanceof BasicInstrument;
export const isSample = (e: BankEntity) => e instanceof BasicSample;

/**
 * Elements selected with Shift or Ctrl while `anchor` was the shown element.
 * It only applies while the anchor stays shown, so any other way of changing the view
 * (a click, undo, a focus hint) falls back to selecting just the shown element.
 */
export interface MultiSelection {
    readonly anchor: BankEntity;
    readonly items: ReadonlySet<BankEntity>;
    /**
     * The element the keyboard is on, where Shift and an arrow extend the range to.
     * The anchor when not set.
     */
    readonly cursor?: BankEntity;
}

const EMPTY = new Set<never>();

/**
 * The selected elements: the multi selection made for this view, or the shown element.
 * Selected elements the list no longer shows (removed from the bank, or hidden by the search)
 * are left out, so commands only act on what the user can see selected.
 */
export function getSelection(
    view: BankEditView,
    multi: MultiSelection | null,
    isListed: (entity: BankEntity) => boolean
): ReadonlySet<BankEntity> {
    if (view === "info") {
        return EMPTY;
    }
    if (multi?.anchor !== view) {
        return new Set([view]);
    }
    const items = new Set([...multi.items].filter((e) => isListed(e)));
    return items.size > 0 ? items : new Set([view]);
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
    /**
     * Cmd on macOS, where Ctrl+click opens the context menu.
     */
    metaKey?: boolean;
}

export type ClickResult<T extends BankEntity> =
    { type: "show"; entity: T } | { type: "select"; selection: MultiSelection };

/**
 * What a click on a list item does. Shift selects the range from the shown element and Ctrl
 * (Cmd on macOS) toggles the item, both only when the shown element is in the same list.
 * Otherwise the clicked element is shown.
 */
export function getClickResult<T extends BankEntity>(
    items: readonly T[],
    clicked: T,
    view: BankEditView,
    selected: ReadonlySet<T>,
    { shiftKey, ctrlKey, metaKey = false }: ClickModifiers
): ClickResult<T> {
    const viewIndex = view === "info" ? -1 : items.indexOf(view as T);
    const isToggle = ctrlKey || metaKey;
    if (viewIndex === -1 || view === "info" || !(shiftKey || isToggle)) {
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
                items: new Set(items.slice(start, end + 1)),
                cursor: clicked
            }
        };
    }
    const next = new Set<BankEntity>(selected);
    if (selected.has(clicked)) {
        next.delete(clicked);
    } else {
        next.add(clicked);
    }
    return {
        type: "select",
        selection: { anchor: view, items: next, cursor: clicked }
    };
}

/**
 * How far Page Up and Page Down move in a list.
 */
const PAGE_STEP = 10;

const MOVE_STEPS = new Map([
    ["ArrowUp", -1],
    ["ArrowDown", 1],
    ["PageUp", -PAGE_STEP],
    ["PageDown", PAGE_STEP],
    ["Home", -Infinity],
    ["End", Infinity]
]);

export type ListKeyResult<T extends BankEntity> =
    ClickResult<T> | { type: "clear" };

/**
 * What a key does in the list of the shown element, like in a file manager:
 * - the arrows, Page Up, Page Down, Home and End show another element,
 * - with Shift they select the range from the shown element instead,
 * - with Ctrl they move the keyboard cursor without changing the selection,
 * - Ctrl+Space toggles the element under the cursor, Ctrl+A selects the whole list,
 * - Escape drops the selection.
 * Undefined for other keys, and when the key changes nothing.
 * @param items the listed elements of the shown element's kind
 * @param view the shown element
 * @param multi the multi selection, if any
 * @param key the key, from the event
 * @param modifiers the event's modifiers
 */
export function getListKeyResult<T extends BankEntity>(
    items: readonly T[],
    view: BankEditView,
    multi: MultiSelection | null,
    key: string,
    { shiftKey, ctrlKey, metaKey = false }: ClickModifiers
): ListKeyResult<T> | undefined {
    if (view === "info" || items.length === 0) {
        return undefined;
    }
    const isCtrl = ctrlKey || metaKey;
    const active = multi?.anchor === view ? multi : null;
    if (key === "Escape") {
        return active ? { type: "clear" } : undefined;
    }
    const viewIndex = items.indexOf(view as T);
    const cursor = active?.cursor ?? view;
    const cursorIndex = items.indexOf(cursor as T);
    const selected = active?.items ?? new Set<BankEntity>([view]);
    if (isCtrl && key.toLowerCase() === "a") {
        return viewIndex === -1
            ? undefined
            : {
                  type: "select",
                  selection: { anchor: view, items: new Set(items), cursor }
              };
    }
    if (isCtrl && key === " ") {
        if (viewIndex === -1 || cursorIndex === -1) {
            return undefined;
        }
        const toggled = new Set(selected);
        if (!toggled.delete(cursor)) {
            toggled.add(cursor);
        }
        return {
            type: "select",
            selection: { anchor: view, items: toggled, cursor }
        };
    }
    const step = MOVE_STEPS.get(key);
    if (step === undefined) {
        return undefined;
    }
    // The shown element hidden by the search: the keys start from an end of the list
    if (viewIndex === -1) {
        return {
            type: "show",
            entity: step > 0 ? items[0] : items[items.length - 1]
        };
    }
    const from = cursorIndex === -1 ? viewIndex : cursorIndex;
    const to = Math.min(items.length - 1, Math.max(0, from + step));
    if (to === from && !shiftKey) {
        return undefined;
    }
    const target = items[to];
    if (shiftKey) {
        return {
            type: "select",
            selection: {
                anchor: view,
                items: new Set(
                    items.slice(
                        Math.min(viewIndex, to),
                        Math.max(viewIndex, to) + 1
                    )
                ),
                cursor: target
            }
        };
    }
    if (isCtrl) {
        return {
            type: "select",
            selection: { anchor: view, items: selected, cursor: target }
        };
    }
    return { type: "show", entity: target };
}
