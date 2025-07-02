import {
    type BasicInstrument,
    type BasicZone,
    generatorTypes,
    type SoundFontRange
} from "spessasynth_core";
import { GeneratorCellInput } from "./generator_cell_input.tsx";
import type { GeneratorProps } from "../generator_row.tsx";
import { SetRangeAction } from "./set_range_action.ts";

export function RangeGeneratorCell({
    zone,
    keyRange,
    velRange,
    linkedZone,
    generator,
    callback,
    manager,
    instrument,
    colSpan
}: Omit<GeneratorProps, "generator"> & {
    zone: BasicZone;
    keyRange: SoundFontRange;
    velRange: SoundFontRange;
    linkedZone?: BasicZone;
    generator: generatorTypes.keyRange | generatorTypes.velRange;
    colSpan: number;
    instrument?: BasicInstrument;
}) {
    const isKeyRange = generator === generatorTypes.keyRange;
    const range = isKeyRange ? keyRange : velRange;

    let rangeText = "";
    if (range.min !== -1) {
        if (range.max === range.min) {
            rangeText = range.min.toString();
        } else {
            rangeText = `${range.min}-${range.max}`;
        }
    }

    const setValue = (typedText: string) => {
        const v = typedText.replace(/[^0-9-]/g, "");
        if (typedText === rangeText) {
            return typedText;
        }
        const newRange: SoundFontRange = { min: 0, max: 127 };
        if (v.length < 1) {
            newRange.min = -1;
            newRange.max = 127;
        } else if (!v.includes("-")) {
            const key = parseInt(v);
            newRange.min = newRange.max = key;
        } else {
            const [min, max] = v.split("-").map(Number);
            newRange.min = Math.min(127, Math.max(0, min));
            newRange.max = Math.max(min, Math.min(127, max));
        }

        const callbackReal = () => {
            if (instrument) {
                manager.sortInstrumentZones(instrument);
            }
            callback();
        };

        const actions = [
            new SetRangeAction(
                zone,
                generator,
                { ...range },
                { ...newRange },
                callbackReal
            )
        ];

        if (linkedZone) {
            const oldLinked = isKeyRange
                ? linkedZone.keyRange
                : linkedZone.velRange;
            actions.push(
                new SetRangeAction(
                    linkedZone,
                    generator,
                    { ...oldLinked },
                    { ...newRange },
                    callbackReal
                )
            );
        }

        manager.modifyBank(actions);

        let newRangeText = "";
        if (range.min !== -1) {
            if (range.max === range.min) {
                newRangeText = range.min.toString();
            } else {
                newRangeText = `${range.min}-${range.max}`;
            }
        }
        return newRangeText;
    };

    return (
        <td className={"generator_cell"} colSpan={colSpan}>
            <GeneratorCellInput
                regex={/[^0-9-]/g}
                type={"text"}
                maxLength={10}
                value={rangeText}
                onBlur={setValue}
            />
        </td>
    );
}
