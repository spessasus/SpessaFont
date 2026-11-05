import type * as React from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { BasicInstrument, type BasicPreset } from "spessasynth_core";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { useClipboard } from "../../clipboard/clipboard_context.ts";
import type { ContextMenuEntry } from "../../context_menu/context_menu_context.ts";
import { logWarn } from "../../utils/core_utils.ts";
import type { GeneratorRowType } from "../generator_row_type.ts";
import type { ZoneColumn } from "../zone_columns.ts";
import { planCellPaste } from "./cell_clipboard.ts";
import {
    type CellContext,
    createCellEditActions,
    createSetCellActions,
    formatCell,
    nudgeCellValue,
    readColumnCell
} from "./cell_values.ts";
import type { CellInputCommands } from "./generator_cell_input.tsx";

/**
 * The system clipboard for the right-click menu, which has no clipboard event to use.
 * Browsers may refuse it, then only the copy inside the app works.
 */
async function writeSystemText(text: string) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (error) {
        logWarn("Could not write to the system clipboard.", error);
    }
}

async function readSystemText() {
    try {
        return await navigator.clipboard.readText();
    } catch (error) {
        logWarn("Could not read the system clipboard.", error);
        return undefined;
    }
}

/**
 * Copy, cut, paste, clearing and wheel steps for the cells of one generator row. A command on a
 * cell of a multi-selection acts on all selected cells. A copy of a stereo column takes its
 * first zone, while a paste, a clear and a wheel step change both zones, the relative ones
 * each from its own value.
 * @param element the edited element
 * @param row the row
 * @param columns the row's columns, in table order
 * @param selectedColumns the selected cells of this row
 */
export function useCellCommands(
    element: BasicPreset | BasicInstrument,
    row: GeneratorRowType,
    columns: readonly ZoneColumn[],
    selectedColumns: readonly ZoneColumn[]
) {
    const { t } = useTranslation();
    const { apply } = useBankEditor();
    const { clipboard } = useClipboard();
    const { generator } = row;
    const context: CellContext = {
        element,
        row,
        isInstrument: element instanceof BasicInstrument
    };

    const getTargets = (column: ZoneColumn) =>
        selectedColumns.length > 1 && selectedColumns.includes(column)
            ? selectedColumns.toSorted(
                  (a, b) => columns.indexOf(a) - columns.indexOf(b)
              )
            : [column];

    const copy = (column: ZoneColumn) => {
        const values = getTargets(column).map((c) =>
            readColumnCell(element, c, generator)
        );
        const text = values.map((v) => formatCell(row, v)).join("\t");
        clipboard.copyCells({
            generator,
            isInstrument: context.isInstrument,
            values,
            text
        });
        return text;
    };

    const clear = (column: ZoneColumn) => {
        const actions = getTargets(column).flatMap((c) =>
            createSetCellActions(context, c, null)
        );
        if (actions.length > 0) {
            apply(actions);
        }
    };

    const cut = (column: ZoneColumn) => {
        const text = copy(column);
        clear(column);
        return text;
    };

    const paste = (column: ZoneColumn, text: string | undefined) => {
        const plan = planCellPaste(
            context,
            columns,
            getTargets(column).map((c) => columns.indexOf(c)),
            text,
            clipboard.cells
        );
        switch (plan.kind) {
            case "otherTable": {
                toast.error(t("toolsLocale.cells.otherTable"));
                break;
            }

            case "invalid": {
                toast.error(
                    t("toolsLocale.cells.invalidText", { text: plan.text })
                );
                break;
            }

            case "actions": {
                if (plan.actions.length > 0) {
                    apply(plan.actions);
                }
            }
        }
    };

    const nudge = (column: ZoneColumn, direction: 1 | -1, steps: number) => {
        const targets = getTargets(column);
        const actions = targets.flatMap(
            (c) =>
                createCellEditActions(context, c, (current, base) =>
                    nudgeCellValue(context, current, base, direction, steps)
                ) ?? []
        );
        if (actions.length === 0) {
            return;
        }
        // Notches in a row on the same cells are one undo step
        const ids = targets.map((c) => c.zone.id).join(" ");
        apply(actions, `nudge ${generator} ${ids}`);
    };

    /**
     * Sets the picked value of a select cell in it, or in all selected cells.
     */
    const pick = (column: ZoneColumn, value: number | null) => {
        const actions = getTargets(column).flatMap((c) =>
            createSetCellActions(context, c, value)
        );
        if (actions.length > 0) {
            apply(actions);
        }
    };

    /**
     * The commands of one cell's input.
     */
    const getInputCommands = (column: ZoneColumn): CellInputCommands => ({
        copy: () => copy(column),
        cut: () => cut(column),
        paste: (text) => paste(column, text),
        clear: () => clear(column),
        nudge: (direction, steps) => nudge(column, direction, steps)
    });

    const getMenuEntries = (column: ZoneColumn): ContextMenuEntry[] => [
        {
            label: t("contextMenu.copy"),
            onSelect: () => void writeSystemText(copy(column))
        },
        {
            label: t("contextMenu.cut"),
            onSelect: () => void writeSystemText(cut(column))
        },
        {
            label: t("contextMenu.paste"),
            onSelect: () =>
                void readSystemText().then((text) => paste(column, text))
        },
        {
            label: t("toolsLocale.cells.clear"),
            onSelect: () => clear(column)
        }
    ];

    /**
     * Keys of a select cell, which has no text to copy: Delete clears it, and the clipboard
     * shortcuts act on the cell like the menu does.
     */
    const handleSelectKeyDown = (
        e: React.KeyboardEvent<HTMLSelectElement>,
        column: ZoneColumn
    ) => {
        if (e.key === "Delete" || e.key === "Backspace") {
            e.preventDefault();
            clear(column);
            return;
        }
        if (!(e.ctrlKey || e.metaKey) || e.altKey) {
            return;
        }
        switch (e.key.toLowerCase()) {
            case "c": {
                e.preventDefault();
                void writeSystemText(copy(column));
                break;
            }
            case "x": {
                e.preventDefault();
                void writeSystemText(cut(column));
                break;
            }
            case "v": {
                e.preventDefault();
                void readSystemText().then((text) => paste(column, text));
                break;
            }
        }
    };

    return { getInputCommands, getMenuEntries, handleSelectKeyDown, pick };
}
