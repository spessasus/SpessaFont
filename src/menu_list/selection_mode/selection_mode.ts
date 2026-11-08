import type { BankEditView, BankEntity } from "../../core_backend/bank_view.ts";
import type { LayoutMode } from "../../layout/layout_setting.ts";
import {
    type ClickModifiers,
    getClickResult,
    getListKeyResult,
    type MultiSelection
} from "../menu_selection.ts";

/**
 * The phone's selection mode (spec 6.4). "waiting" is the mode after the section menu's
 * Select…, before the first tap picks the kind.
 */
export type SelectionMode = "off" | "waiting" | "selecting";

/**
 * A tap in selection mode toggles the row, like Ctrl+click.
 */
export const SELECTION_TAP: ClickModifiers = { shiftKey: false, ctrlKey: true };

/**
 * Between selects the range from the shown element, like Shift+click.
 */
export const SELECTION_BETWEEN: ClickModifiers = {
    shiftKey: true,
    ctrlKey: false
};

const NO_MODIFIERS: ClickModifiers = { shiftKey: false, ctrlKey: false };

/**
 * The selection a long press starts. The item is shown too, so the selection applies.
 */
export function startSelection(item: BankEntity) {
    return { anchor: item, items: new Set([item]), cursor: item };
}

/**
 * The modifiers a row click acts with. Phones have no keys to hold, so selection mode stands in
 * for Ctrl, and outside it a tap only shows the row.
 */
export function getTapModifiers(
    layout: LayoutMode,
    mode: SelectionMode,
    event: ClickModifiers
) {
    if (layout === "desktop") {
        return event;
    }
    return mode === "selecting" ? SELECTION_TAP : NO_MODIFIERS;
}

/**
 * The range from the shown element to the last tapped row, which replaces earlier toggles.
 */
export function getBetweenResult<T extends BankEntity>(
    items: readonly T[],
    cursor: T,
    view: BankEditView,
    selected: ReadonlySet<T>
) {
    return getClickResult(items, cursor, view, selected, SELECTION_BETWEEN);
}

/**
 * Every listed element of the shown element's kind, Ctrl+A on desktop.
 */
export function getSelectAllResult<T extends BankEntity>(
    items: readonly T[],
    view: BankEditView,
    multi: MultiSelection | null
) {
    return getListKeyResult(items, view, multi, "a", SELECTION_TAP);
}
