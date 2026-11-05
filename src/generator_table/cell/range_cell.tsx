import type * as React from "react";
import {
    BasicInstrument,
    type BasicPreset,
    GeneratorTypes
} from "spessasynth_core";
import {
    type CellInputCommands,
    GeneratorCellInput
} from "./generator_cell_input.tsx";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import type { ZoneColumn } from "../zone_columns.ts";
import type { GeneratorRowType } from "../generator_row_type.ts";
import {
    applyTextToRange,
    createSetCellActions,
    formatRange
} from "./cell_values.ts";

interface RangeGeneratorCellProps {
    element: BasicPreset | BasicInstrument;
    column: ZoneColumn;
    row: GeneratorRowType;
    label: string;
    commands: CellInputCommands;
    onContextMenu: (e: React.MouseEvent) => void;
    isSelected: boolean;
    /**
     * The selected cells of this row, which take one edit together.
     */
    selectedColumns: readonly ZoneColumn[];
    onSelect: (event: React.MouseEvent) => void;
}

export function RangeGeneratorCell({
    element,
    column,
    row,
    label,
    commands,
    onContextMenu,
    isSelected,
    selectedColumns,
    onSelect
}: RangeGeneratorCellProps) {
    const { apply } = useBankEditor();
    const isKeyRange = row.generator === GeneratorTypes.keyRange;
    const { colSpan } = column;
    const getRange = (target: ZoneColumn) =>
        isKeyRange ? target.zone.keyRange : target.zone.velocityRange;
    const rangeText = formatRange(getRange(column));
    const isMultiSelected = isSelected && selectedColumns.length > 1;
    const targets = isMultiSelected ? selectedColumns : [column];

    const commitText = (typedText: string) => {
        if (typedText === rangeText && targets.length === 1) {
            return rangeText;
        }
        const context = {
            element,
            row,
            isInstrument: element instanceof BasicInstrument
        };
        // Each cell moves from its own range with "+12"
        const ranges = targets.map((target) =>
            applyTextToRange(
                typedText,
                getRange(target) ?? { min: -1, max: 127 }
            )
        );
        apply(
            targets.flatMap((target, i) => {
                const range = ranges[i];
                return range
                    ? createSetCellActions(
                          context,
                          target,
                          range.min === -1 ? null : range
                      )
                    : [];
            })
        );
        const shown = ranges[targets.indexOf(column)];
        return shown ? formatRange(shown) : rangeText;
    };

    return (
        <td
            className={`generator_cell ${isSelected ? "selected" : ""}`}
            colSpan={colSpan}
            onContextMenu={onContextMenu}
        >
            <GeneratorCellInput
                aria-label={label}
                regex={/[^0-9+-]/g}
                type={"text"}
                maxLength={10}
                value={rangeText}
                onClick={onSelect}
                onBlur={commitText}
                commands={commands}
                isMultiSelected={isMultiSelected}
            />
        </td>
    );
}
