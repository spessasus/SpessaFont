import {
    BasicInstrumentZone,
    type BasicPresetZone,
    type BasicZone,
    generatorTypes
} from "spessasynth_core";
import type { NumberGeneratorProps } from "../generator_row.tsx";
import { type CSSProperties, useCallback } from "react";
import { generatorLimits } from "../../core_backend/generator_limits.ts";
import { SetGeneratorAction } from "./set_generator_action.ts";
import { midiNoteToPitchClass } from "../../utils/note_name.ts";
import { GeneratorCellInput } from "./generator_cell_input.tsx";

function getDistinctColor(index: number, total = 10) {
    const hue = ((index - 1) * (360 / total)) % 360;
    const saturation = 255;
    const lightness = 50;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function NumberGeneratorCell<
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
    const value = zone.getGeneratorValue(generator, null);
    const v2txt = useCallback(
        (v: number | null) =>
            v !== null ? fromGenerator(v).toFixed(precision) : "",
        [fromGenerator, precision]
    );
    const textValue = v2txt(value);

    const limits = generatorLimits[generator];
    const placeholder =
        generator === generatorTypes.overridingRootKey &&
        zone instanceof BasicInstrumentZone
            ? `${zone.sample.samplePitch} (${midiNoteToPitchClass(zone.sample.samplePitch)})`
            : "";

    const style: CSSProperties = {};
    if (generator === generatorTypes.exclusiveClass && value && value > 0) {
        style.color = getDistinctColor(value);
        style.fontWeight = "bold";
    }

    const setValue = (typedText: string) => {
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
            new SetGeneratorAction(zone, generator, value, newValue, callback)
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
    };
    return (
        <td className={"generator_cell"} colSpan={colSpan}>
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
}
