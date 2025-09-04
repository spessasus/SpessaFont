import {
    type BasicInstrument,
    type BasicZone,
    generatorTypes,
    type GenericRange
} from "spessasynth_core";
import { GeneratorCellInput } from "./generator_cell_input.tsx";
import type { GeneratorProps } from "../generator_row.tsx";
import { SetRangeAction } from "./set_range_action.ts";
import { typedMemo } from "../../utils/typed_memo.ts";

export type RangeGenerator =
    | typeof generatorTypes.keyRange
    | typeof generatorTypes.velRange;

export const RangeGeneratorCell = typedMemo(function ({
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
    keyRange: GenericRange;
    velRange: GenericRange;
    linkedZone?: BasicZone;
    generator: RangeGenerator;
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
        const newRange: GenericRange = { min: 0, max: 127 };
        if (v.length < 1) {
            newRange.min = -1;
            newRange.max = 127;
        } else if (!v.includes("-")) {
            const key = parseInt(v);
            newRange.min = newRange.max = key;
        } else {
            const [min, max] = v.split("-").map(Number);
            newRange.min = Math.min(127, Math.max(0, min));
            newRange.max = Math.max(newRange.min, Math.min(127, max));
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
});
