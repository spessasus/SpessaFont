import {
    BasicInstrument,
    BasicInstrumentZone,
    type BasicPreset,
    GeneratorLimits,
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

const EXCLUSIVE_CLASS_COLORS = 10;

function getExclusiveClassColor(exclusiveClass: number) {
    const hue = ((exclusiveClass - 1) * (360 / EXCLUSIVE_CLASS_COLORS)) % 360;
    return `hsl(${hue}, 100%, 50%)`;
}

const identity = (v: number) => v;

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
    const min = isInstrument ? limits.min : (limits.presetMin ?? limits.min);
    const max = isInstrument ? limits.max : (limits.presetMax ?? limits.max);

    let placeholder = toText(limits.def);
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
        const raw = Math.floor(toGenerator(typed));
        const newValue = Math.max(min, Math.min(max, raw));
        setGenerator(newValue);
        return toText(newValue);
    };

    const isModulated = zone.modulators.some(
        (m) => m.destination === generator
    );
    const className = `generator_cell ${isModulated ? "modulated" : ""}`;

    if (generator === GeneratorTypes.sampleModes) {
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
                    <option value={0}>
                        {t("soundBankLocale.loopingModes.noLoop")}
                    </option>
                    <option value={1}>
                        {t("soundBankLocale.loopingModes.loop")}
                    </option>
                    <option value={2}>
                        {t("soundBankLocale.loopingModes.startOnRelease")}
                    </option>
                    <option value={3}>
                        {t("soundBankLocale.loopingModes.loopUntilRelease")}
                    </option>
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
