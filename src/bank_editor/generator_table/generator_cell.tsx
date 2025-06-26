import {
    BasicInstrumentZone,
    type BasicPresetZone,
    type BasicZone,
    generatorTypes
} from "spessasynth_core";
import type { NumberGeneratorProps } from "./generator_row.tsx";
import { type CSSProperties, useEffect, useState } from "react";
import { generatorLimits } from "../../core_backend/generator_limits.ts";
import { SetGeneratorAction } from "./set_generator_action.ts";
import { midiNoteToPitchClass } from "../../utils/note_name.ts";

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
    zones,
    manager,
    setZones,
    generator,
    fromGenerator = (v) => v,
    toGenerator = (v) => v,
    precision = 0
}: NumberGeneratorProps<T> & {
    zone: BasicZone;
}) {
    const value = zone.getGeneratorValue(generator, null);
    const textValue = value ? fromGenerator(value).toFixed(precision) : "";
    const [typedText, setTypedText] = useState(textValue);
    useEffect(() => {
        setTypedText(textValue);
    }, [textValue]);

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

    const setValue = () => {
        if (textValue === typedText) {
            return;
        }
        let newValue: number | null = null;
        if (typedText !== "") {
            const num = parseFloat(typedText);
            const rawNum = Math.floor(toGenerator(num));
            newValue = Math.max(limits.min, Math.min(limits.max, rawNum));
        }
        const action = new SetGeneratorAction(
            zone,
            generator,
            value,
            newValue,
            () => {
                console.log("call");
                setZones([...zones]);
            }
        );
        manager.modifyBank([action]);
    };

    return (
        <td className={"generator_cell"}>
            <input
                type={"text"}
                maxLength={10}
                style={style}
                placeholder={placeholder}
                value={typedText}
                onBlur={setValue}
                onKeyDown={(e) => {
                    if (e.key === "Backspace" || e.key === "Delete") {
                        setTypedText("");
                    }
                }}
                onChange={(e) => {
                    let text = e.target.value;
                    text = text.replace(/[^0-9.]/g, "");
                    setTypedText(text);
                }}
            />
        </td>
    );
}
