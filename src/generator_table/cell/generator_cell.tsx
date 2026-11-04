import {
    BasicInstrument,
    BasicInstrumentZone,
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
import type { ZoneColumn } from "../zone_columns.ts";
import { getColumnZones } from "./column_zones.ts";
import { getGeneratorOptions } from "../generator_options.ts";
import { parseGeneratorText } from "./parse_generator_text.ts";

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
}

export function NumberGeneratorCell({
    element,
    column,
    row,
    label
}: NumberGeneratorCellProps) {
    const { t } = useTranslation();
    const { apply } = useBankEditor();
    const {
        generator,
        fromGenerator = identity,
        toGenerator = identity,
        precision = 0
    } = row;
    const { zone, colSpan } = column;
    const value = zone.getGenerator(generator, null);
    const toText = (v: number | null) =>
        v === null ? "" : fromGenerator(v).toFixed(precision);
    const textValue = toText(value);

    const limits = GeneratorLimits[generator];
    const isInstrument = element instanceof BasicInstrument;
    const { min, max } = getGeneratorRange(generator, isInstrument);

    // An unset preset generator adds nothing to the instrument, so its placeholder is 0
    let placeholder = toText(isInstrument ? limits.def : 0);
    if (
        zone instanceof BasicInstrumentZone &&
        generator === GeneratorTypes.overridingRootKey
    ) {
        const key = zone.sample.originalKey;
        placeholder = `${key} (${midiNoteToPitchClass(key)})`;
    } else if (placeholder === "-1") {
        placeholder = "-";
    }

    const setGenerator = (newValue: number | null) =>
        apply(
            getColumnZones(column).map(
                (z) =>
                    new SetGeneratorAction(
                        element,
                        z,
                        generator,
                        z.getGenerator(generator, null),
                        newValue
                    )
            )
        );

    const commitText = (typedText: string) => {
        if (typedText === textValue) {
            return textValue;
        }
        if (typedText === "") {
            setGenerator(null);
            return "";
        }
        const typed = Number(typedText);
        if (Number.isNaN(typed)) {
            return textValue;
        }
        const newValue = parseGeneratorText(typed, toGenerator, min, max);
        if (newValue === undefined) {
            return textValue;
        }
        setGenerator(newValue);
        return toText(newValue);
    };

    const isModulated = zone.modulators.some(
        (m) => m.destination === generator
    );
    const className = `generator_cell ${isModulated ? "modulated" : ""}`;

    const options = getGeneratorOptions(generator);
    if (options) {
        return (
            <td className={className} colSpan={colSpan}>
                <select
                    aria-label={label}
                    value={value ?? "null"}
                    onChange={(e) =>
                        setGenerator(
                            e.target.value === "null"
                                ? null
                                : Number(e.target.value)
                        )
                    }
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
                regex={/[^0-9-.]/g}
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
                onBlur={commitText}
            />
        </td>
    );
}
