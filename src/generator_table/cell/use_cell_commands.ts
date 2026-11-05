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
import { planPaste, splitClipboardText } from "./cell_clipboard.ts";
import {
    type CellContext,
    createSetCellActions,
    formatCell,
    nudgeCellValue,
    parseCellPart,
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
 * cell of a multi-selection acts on all selected cells.
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
        clipboard.copyCells({ generator, values, text });
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

    /**
     * Pastes the cells copied in the app, or the text when it is something else (copied in
     * another program, or after the cell copy).
     */
    const paste = (column: ZoneColumn, text: string | undefined) => {
        const targets = getTargets(column).map((c) => columns.indexOf(c));
        const cells = clipboard.cells;
        let actions;
        if (cells && (text === undefined || text === cells.text)) {
            if (cells.generator !== generator) {
                toast.error(t("toolsLocale.cells.otherGenerator"));
                return;
            }
            actions = planPaste(
                cells.values.length,
                targets,
                columns.length
            ).flatMap(([c, v]) =>
                createSetCellActions(context, columns[c], cells.values[v])
            );
        } else if (text === undefined) {
            return;
        } else {
            const parts = splitClipboardText(text);
            actions = planPaste(parts.length, targets, columns.length).flatMap(
                ([c, v]) => {
                    const target = columns[c];
                    const value = parseCellPart(
                        context,
                        readColumnCell(element, target, generator),
                        parts[v]
                    );
                    return value === undefined
                        ? []
                        : createSetCellActions(context, target, value);
                }
            );
        }
        if (actions.length > 0) {
            apply(actions);
        }
    };

    const nudge = (column: ZoneColumn, direction: 1 | -1, steps: number) => {
        const targets = getTargets(column);
        const actions = targets.flatMap((c) =>
            createSetCellActions(
                context,
                c,
                nudgeCellValue(
                    context,
                    c,
                    readColumnCell(element, c, generator),
                    direction,
                    steps
                )
            )
        );
        if (actions.length === 0) {
            return;
        }
        // Notches in a row on the same cells are one undo step
        const ids = targets.map((c) => c.zone.id).join(" ");
        apply(actions, `nudge ${generator} ${ids}`);
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

    return { getInputCommands, getMenuEntries, handleSelectKeyDown };
}
