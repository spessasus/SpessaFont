import { BasicInstrument, BasicPreset, BasicSample } from "spessasynth_core";
import type { BankEntity } from "../core_backend/bank_view.ts";
import type { HistoryAction } from "../core_backend/history.ts";
import { DeleteInstrumentAction } from "../instrument_editor/linked_presets/delete_instrument_action.ts";
import { DeleteSampleAction } from "../sample_editor/linked_instruments/delete_sample_action.ts";
import { DeletePresetAction } from "../preset_editor/bottom_bar/delete_preset_action.ts";

/**
 * The actions that delete the selected elements. Instruments and samples that are still used
 * are left alone and counted in `skipped`, so the caller can tell the user.
 */
export function createDeleteSelectionActions(
    selection: ReadonlySet<BankEntity>
) {
    const actions = new Array<HistoryAction>();
    let skipped = 0;
    for (const entity of selection) {
        if (entity instanceof BasicPreset) {
            actions.push(new DeletePresetAction(entity));
        } else if (entity.useCount > 0) {
            skipped++;
        } else if (entity instanceof BasicInstrument) {
            actions.push(new DeleteInstrumentAction(entity));
        } else if (entity instanceof BasicSample) {
            actions.push(new DeleteSampleAction(entity));
        }
    }
    return { actions, skipped };
}
