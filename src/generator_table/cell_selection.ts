import type { GeneratorType } from "spessasynth_core";
import type { LayoutMode } from "../layout/layout_setting.ts";
import type { ZoneColumn } from "./zone_columns.ts";

/**
 * Cells selected with Ctrl or Shift, all in one generator row.
 */
export interface CellSelection {
    generator: GeneratorType;
    zoneIds: ReadonlySet<number>;
    anchorId: number;
}

export interface SelectionModifiers {
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
}

/**
 * A phone tap acts as a Ctrl click, there is no keyboard to hold.
 */
export const PHONE_TAP_MODIFIERS: SelectionModifiers = {
    ctrlKey: true,
    metaKey: false,
    shiftKey: false
};

/**
 * The modifiers a cell click selects with. A phone tap has no keys, so it acts as Ctrl.
 */
export function getTapModifiers(
    layout: LayoutMode,
    event: SelectionModifiers
): SelectionModifiers {
    return layout === "phone" ? PHONE_TAP_MODIFIERS : event;
}

/**
 * The selection after a click on a cell: Ctrl toggles the cell, Shift selects the cells from the
 * last clicked one, a plain click selects nothing. A click in another row starts over there.
 */
export function getCellSelection(
    previous: CellSelection | null,
    generator: GeneratorType,
    columns: readonly ZoneColumn[],
    zoneId: number,
    { ctrlKey, metaKey, shiftKey }: SelectionModifiers
) {
    const isSameRow = previous?.generator === generator;
    const ids = columns.map((c) => c.zone.id);
    // The anchor's zone may be gone after an undo, then Shift starts over
    if (shiftKey && isSameRow && ids.includes(previous.anchorId)) {
        const from = ids.indexOf(previous.anchorId);
        const to = ids.indexOf(zoneId);
        const range = ids.slice(Math.min(from, to), Math.max(from, to) + 1);
        return { ...previous, zoneIds: new Set(range) };
    }
    if (ctrlKey || metaKey || shiftKey) {
        const zoneIds = new Set(isSameRow ? previous.zoneIds : []);
        if (zoneIds.has(zoneId)) {
            zoneIds.delete(zoneId);
        } else {
            zoneIds.add(zoneId);
        }
        return { generator, zoneIds, anchorId: zoneId };
    }
    return null;
}

/**
 * Whether a tap on the grid's wrapper dismisses the phone cell selection. Cells, the header and
 * the view bar keep it. A click on the body itself is the one a swipe leaves behind, since the
 * captured pointer ends its click there.
 */
export function shouldClearCellSelection(target: EventTarget | null) {
    return (
        target instanceof Element &&
        target.tagName !== "TBODY" &&
        !target.closest(".generator_cell, thead, .grid_view_bar")
    );
}
