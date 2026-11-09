import type * as React from "react";
import { GeneratorTypes } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import {
    type CellInputCommands,
    GeneratorCellInput
} from "./generator_cell_input.tsx";
import { getViewZones, type ZoneColumn } from "../zone_columns.ts";
import {
    type CellValue,
    type CellViewContext,
    getColumnDisplay
} from "./cell_values.ts";

/**
 * Exclusive classes get one of this many hues, so neighboring classes look apart.
 */
const EXCLUSIVE_CLASS_HUES = 10;

interface GeneratorCellProps {
    context: CellViewContext;
    column: ZoneColumn;
    /**
     * What the global zone stores for the row, null in the global zone's own cell.
     */
    globalValue: CellValue;
    label: string;
    gridKey: string;
    isActive: boolean;
    isSelected: boolean;
    /**
     * Commits typed text to this cell, or to all selected cells of the row when it is one of
     * them. False when the cell cannot take it, which keeps the edit open.
     */
    onCommit: (text: string) => boolean;
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
    globalValue,
    label,
    gridKey,
    isActive,
    isSelected,
    onCommit,
    onSelect,
    commands,
    onContextMenu
}: GeneratorCellProps) {
    const { t } = useTranslation();
    const { generator } = context.row;
    const display = getColumnDisplay(context, column, globalValue);
    const [firstValue] = display.values;

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
                onCommit={onCommit}
                commands={commands}
            />
        </td>
    );
}
