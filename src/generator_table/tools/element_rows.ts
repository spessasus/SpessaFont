import { BasicInstrument, type BasicPreset } from "spessasynth_core";
import { INSTRUMENT_ROWS } from "../../instrument_editor/instrument_rows.ts";
import { PRESET_ROWS } from "../../preset_editor/preset_rows.ts";

/**
 * The generator rows of the table for an element, instrument or preset.
 */
export function getElementRows(
    element: BasicPreset | BasicInstrument | undefined
) {
    return element instanceof BasicInstrument ? INSTRUMENT_ROWS : PRESET_ROWS;
}
