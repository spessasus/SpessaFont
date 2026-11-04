import {
    BasicInstrument,
    BasicInstrumentZone,
    type BasicPreset
} from "spessasynth_core";
import { GeneratorCellInput } from "./generator_cell_input.tsx";
import { SetGeneratorAction } from "./set_generator_action.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import type { ZoneColumn } from "../zone_columns.ts";
import { getColumnZones } from "./column_zones.ts";
import {
    COARSE_OFFSET_SIZE,
    getCoarseOffsetGenerator,
    type OffsetGenerator
} from "./offset_generator.ts";

interface OffsetGeneratorCellProps {
    element: BasicPreset | BasicInstrument;
    column: ZoneColumn;
    generator: OffsetGenerator;
    label: string;
}

/**
 * Edits a sample offset as one number, split into the fine and coarse generators.
 */
export function OffsetGeneratorCell({
    element,
    column,
    generator,
    label
}: OffsetGeneratorCellProps) {
    const { apply } = useBankEditor();
    const { zone, colSpan } = column;
    const coarseGenerator = getCoarseOffsetGenerator(generator);
    const fine = zone.getGenerator(generator, null);
    const coarse = zone.getGenerator(coarseGenerator, null);
    const textValue =
        fine === null && coarse === null
            ? ""
            : ((fine ?? 0) + (coarse ?? 0) * COARSE_OFFSET_SIZE).toString();

    const setOffset = (offset: number | null) => {
        const newFine = offset === null ? null : offset % COARSE_OFFSET_SIZE;
        const newCoarse =
            offset === null
                ? null
                : Math.trunc(offset / COARSE_OFFSET_SIZE) || null;
        apply(
            getColumnZones(column).flatMap((z) => [
                new SetGeneratorAction(
                    element,
                    z,
                    generator,
                    z.getGenerator(generator, null),
                    newFine
                ),
                new SetGeneratorAction(
                    element,
                    z,
                    coarseGenerator,
                    z.getGenerator(coarseGenerator, null),
                    newCoarse
                )
            ])
        );
    };

    const commitText = (typedText: string) => {
        if (typedText === textValue) {
            return textValue;
        }
        if (typedText === "") {
            setOffset(null);
            return "";
        }
        const typed = Number.parseInt(typedText);
        if (Number.isNaN(typed)) {
            return textValue;
        }
        // An offset cannot move past the whole sample
        const limit =
            zone instanceof BasicInstrumentZone
                ? zone.sample.sampleLength - 1
                : Infinity;
        const offset = Math.min(limit, Math.max(-limit, typed));
        setOffset(offset);
        return offset.toString();
    };

    return (
        <td className={"generator_cell"} colSpan={colSpan}>
            <GeneratorCellInput
                aria-label={label}
                value={textValue}
                regex={/[^0-9-]/g}
                onBlur={commitText}
                maxLength={10}
                type={"text"}
            />
        </td>
    );
}
