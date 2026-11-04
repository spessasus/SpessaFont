import {
    BasicInstrument,
    BasicPreset,
    type BasicZone,
    type GenericRange
} from "spessasynth_core";
import type { BankEditView } from "../core_backend/bank_view.ts";

const FULL_KEY_RANGE: GenericRange = { min: 0, max: 127 };

/**
 * spessasynth_core marks a key range that is not set with a minimum of -1,
 * which means every key.
 */
function getKeyRange(zone: BasicZone) {
    return zone.keyRange.min === -1 ? FULL_KEY_RANGE : zone.keyRange;
}

/**
 * The part of the range inside the bounds, or undefined when they do not overlap.
 */
function clampRange(range: GenericRange, bounds: GenericRange) {
    if (range.max < bounds.min || range.min > bounds.max) {
        return undefined;
    }
    return {
        min: Math.max(bounds.min, range.min),
        max: Math.min(bounds.max, range.max)
    };
}

/**
 * The key ranges of the zones, clamped to the global range.
 */
export function getZoneSplits(
    zones: readonly BasicZone[],
    global: GenericRange
) {
    const splits = new Array<GenericRange>();
    for (const zone of zones) {
        const split = clampRange(getKeyRange(zone), global);
        if (split) {
            splits.push(split);
        }
    }
    return splits;
}

function getPresetSplits(preset: BasicPreset) {
    const presetRange = getKeyRange(preset.globalZone);
    const splits = new Array<GenericRange>();
    for (const zone of preset.zones) {
        const range = clampRange(
            getKeyRange(zone),
            getKeyRange(zone.instrument.globalZone)
        );
        if (!range) {
            continue;
        }
        for (const split of getZoneSplits(zone.instrument.zones, range)) {
            const clamped = clampRange(split, presetRange);
            if (clamped) {
                splits.push(clamped);
            }
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
        return getZoneSplits(view.zones, getKeyRange(view.globalZone));
    }
    return [];
}
