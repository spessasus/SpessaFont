import {
    BasicInstrument,
    BasicPreset,
    type BasicZone,
    type GenericRange
} from "spessasynth_core";
import type { BankEditView } from "../core_backend/bank_view.ts";

const FULL_KEY_RANGE: GenericRange = { min: 0, max: 127 };

/**
 * The keys a zone plays, the way spessasynth_core picks them: the zone's own range, or the
 * global zone's when it has none. The global range never narrows a zone's own range.
 * A range that is not set has a minimum of -1, which means every key.
 */
function getZoneKeys(zone: BasicZone, globalZone: BasicZone) {
    const range = zone.hasKeyRange ? zone.keyRange : globalZone.keyRange;
    return range.min === -1 ? FULL_KEY_RANGE : range;
}

/**
 * The keys both ranges cover, or undefined when they do not overlap.
 */
function intersectRanges(a: GenericRange, b: GenericRange) {
    const min = Math.max(a.min, b.min);
    const max = Math.min(a.max, b.max);
    return min <= max ? { min, max } : undefined;
}

function getInstrumentSplits(instrument: BasicInstrument) {
    return instrument.zones.map((zone) =>
        getZoneKeys(zone, instrument.globalZone)
    );
}

/**
 * A preset zone and an instrument zone are matched separately, so a key plays where both
 * of their ranges cover it.
 */
function getPresetSplits(preset: BasicPreset) {
    const splits = new Array<GenericRange>();
    for (const zone of preset.zones) {
        const presetKeys = getZoneKeys(zone, preset.globalZone);
        for (const instrumentKeys of getInstrumentSplits(zone.instrument)) {
            const split = intersectRanges(presetKeys, instrumentKeys);
            if (split) {
                splits.push(split);
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
        return getInstrumentSplits(view);
    }
    return [];
}
