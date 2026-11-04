import {
    BasicInstrument,
    BasicPreset,
    type GenericRange
} from "spessasynth_core";
import type { BankEditView } from "../core_backend/bank_view.ts";
import type {
    BankViews,
    InstrumentView,
    PresetView,
    ZoneView
} from "../core_backend/entity_views.ts";
import { getObjectId } from "./object_id.ts";

const FULL_KEY_RANGE: GenericRange = { min: 0, max: 127 };

/**
 * The keys a zone plays, the way spessasynth_core picks them: the zone's own range, or the
 * global zone's when it has none. The global range never narrows a zone's own range.
 * A range that is not set means every key.
 */
function getZoneKeys(zone: ZoneView, globalZone: ZoneView): GenericRange {
    const range = zone.keyRange ?? globalZone.keyRange;
    return range ? { min: range.min, max: range.max } : FULL_KEY_RANGE;
}

/**
 * The keys both ranges cover, or undefined when they do not overlap.
 */
function intersectRanges(a: GenericRange, b: GenericRange) {
    const min = Math.max(a.min, b.min);
    const max = Math.min(a.max, b.max);
    return min <= max ? { min, max } : undefined;
}

function getInstrumentSplits(instrument: InstrumentView) {
    return instrument.zones.map((zone) =>
        getZoneKeys(zone, instrument.globalZone)
    );
}

/**
 * A preset zone and an instrument zone are matched separately, so a key plays where both
 * of their ranges cover it.
 */
function getPresetSplits(preset: PresetView, views: BankViews) {
    const splits = new Array<GenericRange>();
    for (const zone of preset.zones) {
        const instrument =
            zone.childId === undefined
                ? undefined
                : views.instruments.get(zone.childId);
        if (!instrument) {
            continue;
        }
        const presetKeys = getZoneKeys(zone, preset.globalZone);
        for (const instrumentKeys of getInstrumentSplits(instrument)) {
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
export function getViewSplits(
    view: BankEditView,
    views: BankViews
): GenericRange[] {
    if (view === "info") {
        return [];
    }
    const id = getObjectId(view);
    if (view instanceof BasicPreset) {
        const preset = views.presets.get(id);
        return preset ? getPresetSplits(preset, views) : [];
    }
    if (view instanceof BasicInstrument) {
        const instrument = views.instruments.get(id);
        return instrument ? getInstrumentSplits(instrument) : [];
    }
    return [];
}
