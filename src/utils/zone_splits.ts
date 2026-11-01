import {
    BasicInstrument,
    BasicPreset,
    type BasicZone,
    type GenericRange
} from "spessasynth_core";
import type { BankEditView } from "../core_backend/bank_view.ts";

/**
 * The key ranges of the zones, clamped to the global range.
 * A zone without a key range covers the whole global range.
 */
export function getZoneSplits(
    zones: readonly BasicZone[],
    global: GenericRange
): GenericRange[] {
    const splits: GenericRange[] = [];
    for (let {
        keyRange: { min, max }
    } of zones) {
        if (min === -1) {
            min = global.min;
            max = global.max;
        }
        // don't add out of range
        if (max < global.min || min > global.max) {
            continue;
        }
        // clamp in range
        max = Math.min(global.max, max);
        min = Math.max(global.min, min);
        splits.push({ min, max });
    }
    return splits;
}

function getPresetSplits(preset: BasicPreset) {
    const splits: GenericRange[] = [];
    const glob = preset.globalZone.keyRange;
    for (const {
        keyRange: { min, max },
        instrument: { zones, globalZone }
    } of preset.zones) {
        const range = { ...globalZone.keyRange };
        range.min = Math.max(range.min, min);
        range.max = Math.min(range.max, max);
        for (let { min, max } of getZoneSplits(zones, range)) {
            // don't add out of range
            if (max < glob.min || min > glob.max) {
                continue;
            }
            // clamp in range
            max = Math.min(glob.max, max);
            min = Math.max(glob.min, min);
            splits.push({ min, max });
        }
    }
    return splits;
}

/**
 * The key ranges the keyboard highlights for the shown element.
 */
export function getViewSplits(view: BankEditView): GenericRange[] {
    if (view instanceof BasicPreset) {
        return getPresetSplits(view);
    }
    if (view instanceof BasicInstrument) {
        return getZoneSplits(view.zones, view.globalZone.keyRange);
    }
    return [];
}
