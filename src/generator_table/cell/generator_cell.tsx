import {
    BasicGlobalZone,
    BasicInstrumentZone,
    type BasicPresetZone,
    type BasicZone,
    generatorTypes
} from "spessasynth_core";
import type { NumberGeneratorProps } from "../generator_row.tsx";
import { type CSSProperties, useCallback, useMemo } from "react";
import { generatorLimits } from "../../core_backend/generator_limits.ts";
import { SetGeneratorAction } from "./set_generator_action.ts";
import { midiNoteToPitchClass } from "../../utils/note_name.ts";
import { GeneratorCellInput } from "./generator_cell_input.tsx";
import { useTranslation } from "react-i18next";
import { typedMemo } from "../../utils/typed_memo.ts";

function getDistinctColor(index: number, total = 10) {
    const hue = ((index - 1) * (360 / total)) % 360;
    const saturation = 255;
    const lightness = 50;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export const NumberGeneratorCell = typedMemo(function <
    T extends BasicPresetZone | BasicInstrumentZone
>({
    zone,
    callback,
    manager,
    generator,
    linkedZone,
    fromGenerator = (v) => v,
    toGenerator = (v) => v,
    precision = 0,
    colSpan
}: NumberGeneratorProps & {
    zone: BasicZone;
    linkedZone?: T;
    colSpan: number;
}) {
    const { t } = useTranslation();
    const value = zone.getGenerator(generator, null);
    const v2txt = useCallback(
        (v: number | null) =>
            v !== null ? fromGenerator(v).toFixed(precision) : "",
        [fromGenerator, precision]
    );

    const textValue = v2txt(value);

    const limits = generatorLimits[generator];
    let placeholder = "";
    if (
        zone instanceof BasicInstrumentZone &&
        generator === generatorTypes.overridingRootKey
    ) {
        placeholder = `${zone.sample.originalKey} (${midiNoteToPitchClass(
            zone.sample.originalKey
        )})`;
    } else if (zone instanceof BasicGlobalZone) {
        placeholder = v2txt(limits.def);
        if (placeholder === "-1") {
            placeholder = "-";
        }
    }

    const modulated = useMemo(
        () => !!zone.modulators.find((m) => m.destination === generator),
        [generator, zone.modulators]
    );

    const style: CSSProperties = {};
    if (generator === generatorTypes.exclusiveClass && value && value > 0) {
        style.color = getDistinctColor(value);
        style.fontWeight = "bold";
    }

    const setValue = useCallback(
        (typedText: string) => {
            if (textValue === typedText) {
                return textValue;
            }
            let newValue: number | null = null;
            if (typedText !== "") {
                const num = parseFloat(typedText);
                const rawNum = Math.floor(toGenerator(num));
                newValue = Math.max(limits.min, Math.min(limits.max, rawNum));
            }
            const actions = [
                new SetGeneratorAction(
                    zone,
                    generator,
                    value,
                    newValue,
                    callback
                )
            ];
            if (linkedZone) {
                actions.push(
                    new SetGeneratorAction(
                        linkedZone,
                        generator,
                        value,
                        newValue,
                        callback
                    )
                );
            }
            manager.modifyBank(actions);
            return v2txt(newValue);
        },
        [
            callback,
            generator,
            limits.max,
            limits.min,
            linkedZone,
            manager,
            textValue,
            toGenerator,
            v2txt,
            value,
            zone
        ]
    );

    // loop playback special case
    if (generator === generatorTypes.sampleModes) {
        return (
            <td className={`generator_cell`} colSpan={colSpan}>
                <select
                    value={value ?? "none"}
                    onChange={(e) =>
                        setValue(
                            e.target.value === "null" ? "" : e.target.value
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

    return (
        <td
            className={`generator_cell ${modulated ? "modulated" : ""}`}
            colSpan={colSpan}
        >
            <GeneratorCellInput
                regex={/[^0-9-.]/g}
                type={"text"}
                maxLength={10}
                style={style}
                placeholder={placeholder}
                value={textValue}
                onBlur={setValue}
            />
        </td>
    );
});
