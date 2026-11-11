import { BasicInstrument, type BasicPreset } from "spessasynth_core";
import { INSTRUMENT_ROWS } from "../../instrument_editor/instrument_rows.ts";
import { PRESET_ROWS } from "../../preset_editor/preset_rows.ts";
import type { GeneratorRowType } from "../generator_row_type.ts";
import { isSFEGenerator } from "../../core_backend/sfe_data.ts";

/**
 * Filtered once per list, so the rows keep their identity between renders.
 */
const SF2_ROWS = new WeakMap<
    readonly GeneratorRowType[],
    readonly GeneratorRowType[]
>();

/**
 * The rows the table shows. SF2 mode hides the SFE generators, which stay in the bank.
 */
export function getShownRows(
    rows: readonly GeneratorRowType[],
    isSFE: boolean
) {
    if (isSFE) {
        return rows;
    }
    let shown = SF2_ROWS.get(rows);
    if (!shown) {
        shown = rows.filter((row) => !isSFEGenerator(row.generator));
        SF2_ROWS.set(rows, shown);
    }
    return shown;
}

/**
 * The generator rows of the table for an element, instrument or preset, in this bank format.
 */
export function getElementRows(
    element: BasicPreset | BasicInstrument | undefined,
    isSFE: boolean
) {
    return getShownRows(
        element instanceof BasicInstrument ? INSTRUMENT_ROWS : PRESET_ROWS,
        isSFE
    );
}
