import {
    type BasicZone,
    GeneratorTypes,
    type GenericRange
} from "spessasynth_core";
import { GeneratorCellInput } from "./generator_cell_input.tsx";
import type { GeneratorProps } from "../generator_row.tsx";
import { SetRangeAction } from "./set_range_action.ts";
import type { RangeGenerator } from "./range_generator.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";

export function RangeGeneratorCell({
    zone,
    keyRange,
    velRange,
    linkedZone,
    generator,
    element,
    colSpan
}: Omit<GeneratorProps, "generator"> & {
    zone: BasicZone;
    keyRange: GenericRange;
    velRange: GenericRange;
    linkedZone?: BasicZone;
    generator: RangeGenerator;
    colSpan: number;
}) {
    const { apply } = useBankEditor();
    const isKeyRange = generator === GeneratorTypes.keyRange;
    const range = isKeyRange ? keyRange : velRange;

    let rangeText = "";
    if (range.min !== -1) {
        rangeText =
            range.max === range.min
                ? range.min.toString()
                : `${range.min}-${range.max}`;
    }

    const setValue = (typedText: string) => {
        const v = typedText.replaceAll(/[^0-9-]/g, "");
        if (typedText === rangeText) {
            return typedText;
        }
        const newRange: GenericRange = { min: 0, max: 127 };
        if (v.length === 0) {
            newRange.min = -1;
            newRange.max = 127;
        } else if (v.includes("-")) {
            const [min, max] = v.split("-").map(Number);
            newRange.min = Math.min(127, Math.max(0, min));
            newRange.max = Math.max(newRange.min, Math.min(127, max));
        } else {
            const key = Number.parseInt(v);
            newRange.min = newRange.max = key;
        }

        const actions = [
            new SetRangeAction(element, zone, generator, range, newRange)
        ];

        if (linkedZone) {
            const oldLinked = isKeyRange
                ? linkedZone.keyRange
                : linkedZone.velRange;
            actions.push(
                new SetRangeAction(
                    element,
                    linkedZone,
                    generator,
                    oldLinked,
                    newRange
                )
            );
        }

        apply(actions);

        let newRangeText = "";
        if (range.min !== -1) {
            newRangeText =
                range.max === range.min
                    ? range.min.toString()
                    : `${range.min}-${range.max}`;
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
