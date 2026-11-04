import type * as React from "react";
import {
    BasicInstrument,
    type BasicPreset,
    GeneratorLimits,
    type GeneratorType,
    GeneratorTypes
} from "spessasynth_core";
import { SetGeneratorAction } from "./set_generator_action.ts";
import { midiNoteToPitchClass } from "../../utils/note_name.ts";
import { GeneratorCellInput } from "./generator_cell_input.tsx";
import { useTranslation } from "react-i18next";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import type { GeneratorRowType } from "../generator_row_type.ts";
import { getViewGenerator, type ZoneColumn } from "../zone_columns.ts";
import { getColumnZones } from "./column_zones.ts";
import { getGeneratorOptions } from "../generator_options.ts";
import {
    applyCellEdit,
    parseCellText,
    parseGeneratorText
} from "./parse_generator_text.ts";

const EXCLUSIVE_CLASS_COLORS = 10;

function getExclusiveClassColor(exclusiveClass: number) {
    const hue = ((exclusiveClass - 1) * (360 / EXCLUSIVE_CLASS_COLORS)) % 360;
    return `hsl(${hue}, 100%, 50%)`;
}

const identity = (v: number) => v;

/**
 * The range of a generator in an instrument or a preset zone.
 * spessasynth_core 4.4.5 has no preset ranges for generators 61 to 88, so a preset offset there
 * may span the whole instrument range in either direction. Preset ranges in core remove this.
 */
function getGeneratorRange(generator: GeneratorType, isInstrument: boolean) {
    const { min, max, presetMin, presetMax } = GeneratorLimits[generator];
    if (isInstrument) {
        return { min, max };
    }
    const span = max - min;
    return { min: presetMin ?? -span, max: presetMax ?? span };
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
}

export function NumberGeneratorCell({
    element,
    column,
    row,
    label,
    isSelected,
    selectedColumns,
    onSelect
}: NumberGeneratorCellProps) {
    const { t } = useTranslation();
    const { apply } = useBankEditor();
    const {
        generator,
        fromGenerator = identity,
        toGenerator = identity,
        precision = 0
    } = row;
    const { zone, colSpan, sample } = column;
    const value = getViewGenerator(zone, generator);
    const toText = (v: number | null) =>
        v === null ? "" : fromGenerator(v).toFixed(precision);
    const textValue = toText(value);

    const limits = GeneratorLimits[generator];
    const isInstrument = element instanceof BasicInstrument;
    const { min, max } = getGeneratorRange(generator, isInstrument);

    // An unset preset generator adds nothing to the instrument, so its placeholder is 0
    let placeholder = toText(isInstrument ? limits.def : 0);
    if (sample && generator === GeneratorTypes.overridingRootKey) {
        const key = sample.originalKey;
        placeholder = `${key} (${midiNoteToPitchClass(key)})`;
    } else if (placeholder === "-1") {
        placeholder = "-";
    }

    // Several selected cells of this row take one edit, each from its own value
    const targets =
        isSelected && selectedColumns.length > 1 ? selectedColumns : [column];

    const setGenerators = (values: (number | null)[]) =>
        apply(
            targets.flatMap((target, i) =>
                getColumnZones(element, target).map(
                    (z) =>
                        new SetGeneratorAction(
                            element,
                            z,
                            generator,
                            z.getGenerator(generator, null),
                            values[i]
                        )
                )
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
        const edit = parseCellText(typedText);
        if (!edit) {
            return textValue;
        }
        const values = targets.map((target) => {
            // An unset generator changes from what the cell shows for it
            const current =
                getViewGenerator(target.zone, generator) ??
                (isInstrument ? limits.def : 0);
            const shown = Number(fromGenerator(current).toFixed(precision));
            return (
                parseGeneratorText(
                    applyCellEdit(edit, shown),
                    toGenerator,
                    min,
                    max
                ) ?? current
            );
        });
        setGenerators(values);
        return toText(values[targets.indexOf(column)] ?? value);
    };

    const isModulated = zone.modulators.some(
        (m) => m.destination === generator
    );
    const className = `generator_cell ${isModulated ? "modulated" : ""} ${isSelected ? "selected" : ""}`;

    const options = getGeneratorOptions(generator);
    if (options) {
        return (
            <td className={className} colSpan={colSpan}>
                <select
                    aria-label={label}
                    value={value ?? "null"}
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
        <td className={className} colSpan={colSpan}>
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
            />
        </td>
    );
}
