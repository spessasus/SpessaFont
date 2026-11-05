import {
    BasicInstrument,
    type BasicPreset,
    GeneratorTypes
} from "spessasynth_core";
import type { GeneratorRowType } from "../generator_table/generator_row_type.ts";
import { SetGeneratorAction } from "../generator_table/cell/set_generator_action.ts";
import type { CellEdit } from "../generator_table/cell/parse_generator_text.ts";
import { applyEditToNumber } from "../generator_table/cell/cell_values.ts";
import { getGeneratorDefault } from "../generator_table/generator_range.ts";
import { isOffsetGenerator } from "../generator_table/cell/offset_generator.ts";

/**
 * Where a batch edit goes: the global zone of each element, or each of its zones.
 */
export type BatchScope = "global" | "zones";

/**
 * Whether a row takes one number, so it can be edited for many elements at once.
 * Ranges and the sample offsets (a fine and a coarse generator) cannot.
 */
export function isBatchEditableRow(row: GeneratorRowType) {
    return (
        row.generator !== GeneratorTypes.keyRange &&
        row.generator !== GeneratorTypes.velRange &&
        !isOffsetGenerator(row.generator)
    );
}

/**
 * Applies one cell edit ("set", "add" or "multiply") to a generator of many elements, in the
 * units the table shows, like typing it into each cell. An unset generator changes from what
 * its cell shows (the default for instruments, nothing for presets).
 */
export function createBatchGeneratorActions(
    elements: Iterable<BasicPreset | BasicInstrument>,
    row: GeneratorRowType,
    edit: CellEdit,
    scope: BatchScope
) {
    const { generator } = row;
    const actions = new Array<SetGeneratorAction>();
    for (const element of elements) {
        const isInstrument = element instanceof BasicInstrument;
        const context = { element, row, isInstrument };
        const zones = scope === "global" ? [element.globalZone] : element.zones;
        for (const zone of zones) {
            const previous = zone.getGenerator(generator, null);
            const current =
                previous ?? getGeneratorDefault(generator, isInstrument);
            const value = applyEditToNumber(context, previous, edit);
            // An unset generator that would get the value it already plays stays unset
            if (value !== undefined && value !== current) {
                actions.push(
                    new SetGeneratorAction(
                        element,
                        zone,
                        generator,
                        previous,
                        value
                    )
                );
            }
        }
    }
    return actions;
}
