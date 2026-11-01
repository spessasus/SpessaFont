import type {
    BasicInstrument,
    BasicPreset,
    GenericRange
} from "spessasynth_core";
import { GeneratorTypes } from "spessasynth_core";
import { GeneratorCellInput } from "./generator_cell_input.tsx";
import { SetRangeAction } from "./set_range_action.ts";
import type { RangeGenerator } from "./range_generator.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import type { ZoneColumn } from "../zone_columns.ts";
import { getColumnZones } from "./column_zones.ts";

function formatRange({ min, max }: GenericRange) {
    if (min === -1) {
        return "";
    }
    return min === max ? min.toString() : `${min}-${max}`;
}

const clampMIDI = (v: number) => Math.min(127, Math.max(0, v));

/**
 * Reads "60" or "60-72". Returns undefined for text that is not a range.
 */
function parseRange(text: string): GenericRange | undefined {
    if (text === "") {
        // An unset range
        return { min: -1, max: 127 };
    }
    const [minText, maxText = minText] = text.split("-", 2);
    const min = Number.parseInt(minText);
    const max = Number.parseInt(maxText);
    if (Number.isNaN(min) || Number.isNaN(max)) {
        return undefined;
    }
    const clampedMin = clampMIDI(min);
    return { min: clampedMin, max: Math.max(clampedMin, clampMIDI(max)) };
}

interface RangeGeneratorCellProps {
    element: BasicPreset | BasicInstrument;
    column: ZoneColumn;
    generator: RangeGenerator;
    label: string;
}

export function RangeGeneratorCell({
    element,
    column,
    generator,
    label
}: RangeGeneratorCellProps) {
    const { apply } = useBankEditor();
    const isKeyRange = generator === GeneratorTypes.keyRange;
    const { zone, colSpan } = column;
    const rangeText = formatRange(isKeyRange ? zone.keyRange : zone.velRange);

    const commitText = (typedText: string) => {
        if (typedText === rangeText) {
            return rangeText;
        }
        const newRange = parseRange(typedText);
        if (!newRange) {
            return rangeText;
        }
        apply(
            getColumnZones(column).map(
                (z) =>
                    new SetRangeAction(
                        element,
                        z,
                        generator,
                        isKeyRange ? z.keyRange : z.velRange,
                        newRange
                    )
            )
        );
        return formatRange(newRange);
    };

    return (
        <td className={"generator_cell"} colSpan={colSpan}>
            <GeneratorCellInput
                aria-label={label}
                regex={/[^0-9-]/g}
                type={"text"}
                maxLength={10}
                value={rangeText}
                onBlur={commitText}
            />
        </td>
    );
}
