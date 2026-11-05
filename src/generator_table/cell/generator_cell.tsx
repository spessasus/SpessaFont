import type * as React from "react";
import { GeneratorTypes } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import {
    type CellInputCommands,
    GeneratorCellInput
} from "./generator_cell_input.tsx";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import type { ZoneView } from "../../core_backend/entity_views.ts";
import { getViewZones, type ZoneColumn } from "../zone_columns.ts";
import {
    type CellContext,
    createTextEditActions,
    getCellDisplay
} from "./cell_values.ts";

/**
 * Exclusive classes get one of this many hues, so neighboring classes look apart.
 */
const EXCLUSIVE_CLASS_HUES = 10;

interface GeneratorCellProps {
    context: CellContext;
    column: ZoneColumn;
    globalZone: ZoneView;
    label: string;
    gridKey: string;
    isActive: boolean;
    isSelected: boolean;
    /**
     * The selected cells of this row, which an edit to a selected cell changes too.
     */
    selectedColumns: readonly ZoneColumn[];
    /**
     * Ctrl or Shift and a click select cells, a plain click clears the selection.
     */
    onSelect: (event: React.MouseEvent) => void;
    commands: CellInputCommands;
    onContextMenu: (e: React.MouseEvent) => void;
}

/**
 * A cell that takes typed text: a number, a key or velocity range, or a sample offset.
 */
export function GeneratorCell({
    context,
    column,
    globalZone,
    label,
    gridKey,
    isActive,
    isSelected,
    selectedColumns,
    onSelect,
    commands,
    onContextMenu
}: GeneratorCellProps) {
    const { t } = useTranslation();
    const { apply } = useBankEditor();
    const { generator } = context.row;
    const display = getCellDisplay(context, column, globalZone);
    const [firstValue] = display.values;

    // Several selected cells of this row take one edit, each from its own value
    const targets =
        isSelected && selectedColumns.length > 1 ? selectedColumns : [column];

    const didCommit = (typedText: string) => {
        if (typedText === display.text && targets.length === 1) {
            return true;
        }
        const actions = createTextEditActions(context, targets, typedText);
        if (!actions) {
            return false;
        }
        if (actions.length > 0) {
            apply(actions);
        }
        return true;
    };

    const isModulated = getViewZones(column).some((z) =>
        z.modulators.some((m) => m.destination === generator)
    );
    const exclusiveClass =
        typeof firstValue === "number" &&
        firstValue > 0 &&
        !display.isMixed &&
        generator === GeneratorTypes.exclusiveClass
            ? firstValue
            : 0;
    const [firstText, secondText] = display.parts;

    return (
        <td
            className={`generator_cell ${isModulated ? "modulated" : ""} ${isSelected ? "selected" : ""}`}
            colSpan={column.colSpan}
            aria-selected={isSelected}
            onContextMenu={onContextMenu}
        >
            <GeneratorCellInput
                label={label}
                title={
                    display.isMixed
                        ? t("toolsLocale.cells.stereoValues", {
                              first: column.sample?.name ?? "",
                              firstValue: firstText,
                              second: column.linkedSample?.name ?? "",
                              secondValue: secondText
                          })
                        : undefined
                }
                gridKey={gridKey}
                isActive={isActive}
                className={exclusiveClass > 0 ? "exclusive_class" : undefined}
                style={
                    exclusiveClass > 0
                        ? {
                              "--exclusive-class-hue":
                                  ((exclusiveClass - 1) * 360) /
                                  EXCLUSIVE_CLASS_HUES
                          }
                        : undefined
                }
                placeholder={display.placeholder}
                value={display.text}
                onClick={onSelect}
                onCommit={didCommit}
                commands={commands}
            />
        </td>
    );
}
