import type * as React from "react";
import {
    BasicInstrument,
    type BasicPreset,
    GeneratorTypes
} from "spessasynth_core";
import { midiNoteToPitchClass } from "../../utils/note_name.ts";
import {
    type CellInputCommands,
    GeneratorCellInput
} from "./generator_cell_input.tsx";
import { useTranslation } from "react-i18next";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import type { GeneratorRowType } from "../generator_row_type.ts";
import { getViewGenerator, type ZoneColumn } from "../zone_columns.ts";
import { getGeneratorOptions } from "../generator_options.ts";
import { getGeneratorDefault } from "../generator_range.ts";
import { useWheelStep } from "../../hooks/use_wheel_step.ts";
import {
    applyTextToNumber,
    type CellContext,
    createSetCellActions,
    formatNumberCell
} from "./cell_values.ts";

const EXCLUSIVE_CLASS_COLORS = 10;

function getExclusiveClassColor(exclusiveClass: number) {
    const hue = ((exclusiveClass - 1) * (360 / EXCLUSIVE_CLASS_COLORS)) % 360;
    return `hsl(${hue}, 100%, 50%)`;
}

interface NumberGeneratorCellProps {
    element: BasicPreset | BasicInstrument;
    column: ZoneColumn;
    row: GeneratorRowType;
    label: string;
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
    onSelectKeyDown: (e: React.KeyboardEvent<HTMLSelectElement>) => void;
    onContextMenu: (e: React.MouseEvent) => void;
}

export function NumberGeneratorCell({
    element,
    column,
    row,
    label,
    isSelected,
    selectedColumns,
    onSelect,
    commands,
    onSelectKeyDown,
    onContextMenu
}: NumberGeneratorCellProps) {
    const { t } = useTranslation();
    const { apply } = useBankEditor();
    const { generator } = row;
    const { zone, colSpan, sample } = column;
    const value = getViewGenerator(zone, generator);
    const textValue = formatNumberCell(row, value);
    const isInstrument = element instanceof BasicInstrument;
    const context: CellContext = { element, row, isInstrument };
    const selectWheelRef = useWheelStep<HTMLSelectElement>(commands.nudge);

    let placeholder = formatNumberCell(
        row,
        getGeneratorDefault(generator, isInstrument)
    );
    if (sample && generator === GeneratorTypes.overridingRootKey) {
        const key = sample.originalKey;
        placeholder = `${key} (${midiNoteToPitchClass(key)})`;
    } else if (placeholder === "-1") {
        placeholder = "-";
    }

    // Several selected cells of this row take one edit, each from its own value
    const isMultiSelected = isSelected && selectedColumns.length > 1;
    const targets = isMultiSelected ? selectedColumns : [column];

    const setGenerators = (values: (number | null)[]) =>
        apply(
            targets.flatMap((target, i) =>
                createSetCellActions(context, target, values[i])
            )
        );

    const commitText = (typedText: string) => {
        if (typedText === textValue && targets.length === 1) {
            return textValue;
        }
        if (typedText === "") {
            setGenerators(targets.map(() => null));
            return "";
        }
        const values = targets.map((target) => {
            const current = getViewGenerator(target.zone, generator);
            return applyTextToNumber(context, current, typedText) ?? current;
        });
        setGenerators(values);
        return formatNumberCell(row, values[targets.indexOf(column)] ?? value);
    };

    const isModulated = zone.modulators.some(
        (m) => m.destination === generator
    );
    const className = `generator_cell ${isModulated ? "modulated" : ""} ${isSelected ? "selected" : ""}`;

    const options = getGeneratorOptions(generator);
    if (options) {
        return (
            <td
                className={className}
                colSpan={colSpan}
                onContextMenu={onContextMenu}
            >
                <select
                    ref={selectWheelRef}
                    aria-label={label}
                    value={value ?? "null"}
                    onKeyDown={onSelectKeyDown}
                    onChange={(e) => {
                        const picked =
                            e.target.value === "null"
                                ? null
                                : Number(e.target.value);
                        setGenerators(targets.map(() => picked));
                    }}
                >
                    <option value={"null"}>{"-"}</option>
                    {options.map((option) => (
                        <option value={option.value} key={option.value}>
                            {t(option.label)}
                        </option>
                    ))}
                </select>
            </td>
        );
    }

    const hasExclusiveClass =
        generator === GeneratorTypes.exclusiveClass &&
        value !== null &&
        value > 0;

    return (
        <td
            className={className}
            colSpan={colSpan}
            onContextMenu={onContextMenu}
        >
            <GeneratorCellInput
                aria-label={label}
                regex={/[^0-9-.+*x]/g}
                type={"text"}
                maxLength={10}
                className={hasExclusiveClass ? "exclusive_class" : undefined}
                style={
                    hasExclusiveClass
                        ? { color: getExclusiveClassColor(value) }
                        : undefined
                }
                placeholder={placeholder}
                value={textValue}
                onClick={onSelect}
                onBlur={commitText}
                commands={commands}
                isMultiSelected={isMultiSelected}
            />
        </td>
    );
}
