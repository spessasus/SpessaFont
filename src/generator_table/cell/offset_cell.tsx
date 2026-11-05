import type * as React from "react";
import { BasicInstrument, type BasicPreset } from "spessasynth_core";
import {
    type CellInputCommands,
    GeneratorCellInput
} from "./generator_cell_input.tsx";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { getViewGenerator, type ZoneColumn } from "../zone_columns.ts";
import type { GeneratorRowType } from "../generator_row_type.ts";
import {
    COARSE_OFFSET_SIZE,
    getCoarseOffsetGenerator,
    isOffsetGenerator
} from "./offset_generator.ts";
import { clamp } from "../generator_range.ts";
import { createSetCellActions } from "./cell_values.ts";

interface OffsetGeneratorCellProps {
    element: BasicPreset | BasicInstrument;
    column: ZoneColumn;
    row: GeneratorRowType;
    label: string;
    commands: CellInputCommands;
    onContextMenu: (e: React.MouseEvent) => void;
}

/**
 * Edits a sample offset as one number, split into the fine and coarse generators.
 */
export function OffsetGeneratorCell({
    element,
    column,
    row,
    label,
    commands,
    onContextMenu
}: OffsetGeneratorCellProps) {
    const { apply } = useBankEditor();
    const { zone, colSpan, sample } = column;
    const { generator } = row;
    if (!isOffsetGenerator(generator)) {
        throw new Error(`Generator ${generator} is not a sample offset.`);
    }
    const fine = getViewGenerator(zone, generator);
    const coarse = getViewGenerator(zone, getCoarseOffsetGenerator(generator));
    const textValue =
        fine === null && coarse === null
            ? ""
            : ((fine ?? 0) + (coarse ?? 0) * COARSE_OFFSET_SIZE).toString();

    const setOffset = (offset: number | null) =>
        apply(
            createSetCellActions(
                {
                    element,
                    row,
                    isInstrument: element instanceof BasicInstrument
                },
                column,
                offset
            )
        );

    const commitText = (typedText: string) => {
        if (typedText === textValue) {
            return textValue;
        }
        if (typedText === "") {
            setOffset(null);
            return "";
        }
        const typed = Number.parseInt(typedText);
        if (Number.isNaN(typed)) {
            return textValue;
        }
        // An offset cannot move past the whole sample
        const limit = sample ? sample.length - 1 : Infinity;
        const offset = clamp(typed, -limit, limit);
        setOffset(offset);
        return offset.toString();
    };

    return (
        <td
            className={"generator_cell"}
            colSpan={colSpan}
            onContextMenu={onContextMenu}
        >
            <GeneratorCellInput
                aria-label={label}
                value={textValue}
                regex={/[^0-9-]/g}
                onBlur={commitText}
                maxLength={10}
                type={"text"}
                commands={commands}
            />
        </td>
    );
}
