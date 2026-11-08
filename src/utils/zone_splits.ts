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
    RangeView,
    ZoneView
} from "../core_backend/entity_views.ts";
import { getObjectId } from "./object_id.ts";

const FULL_RANGE: GenericRange = { min: 0, max: 127 };

/**
 * The keys and velocities one zone (or a preset zone with one of its instrument's zones) plays.
 */
export interface KeySplit {
    keys: GenericRange;
    velocities: GenericRange;
}

/**
 * The way spessasynth_core picks a zone's range: the zone's own range, or the global zone's
 * when it has none. The global range never narrows a zone's own range.
 * A range that is not set means every key or velocity.
 */
export function pickRange(
    zoneRange: RangeView | undefined,
    globalRange: RangeView | undefined
) {
    const range = zoneRange ?? globalRange;
    return range ? { min: range.min, max: range.max } : FULL_RANGE;
}

function getZoneSplit(zone: ZoneView, globalZone: ZoneView) {
    return {
        keys: pickRange(zone.keyRange, globalZone.keyRange),
        velocities: pickRange(zone.velocityRange, globalZone.velocityRange)
    };
}

/**
 * The values both ranges cover, or undefined when they do not overlap.
 */
function intersectRanges(a: GenericRange, b: GenericRange) {
    const min = Math.max(a.min, b.min);
    const max = Math.min(a.max, b.max);
    return min <= max ? { min, max } : undefined;
}

function getInstrumentSplits(instrument: InstrumentView) {
    return instrument.zones.map((zone) =>
        getZoneSplit(zone, instrument.globalZone)
    );
}

/**
 * A preset zone and an instrument zone are matched separately, so a note plays where both
 * of their ranges cover it.
 */
function getPresetSplits(preset: PresetView, views: BankViews) {
    const splits = new Array<KeySplit>();
    for (const zone of preset.zones) {
        const instrument =
            zone.childId === undefined
                ? undefined
                : views.instruments.get(zone.childId);
        if (!instrument) {
            continue;
        }
        const presetSplit = getZoneSplit(zone, preset.globalZone);
        for (const instrumentSplit of getInstrumentSplits(instrument)) {
            const keys = intersectRanges(
                presetSplit.keys,
                instrumentSplit.keys
            );
            const velocities = intersectRanges(
                presetSplit.velocities,
                instrumentSplit.velocities
            );
            if (keys && velocities) {
                splits.push({ keys, velocities });
            }
        }
    }
    return splits;
}

/**
 * The ranges the keyboard highlights for the shown element. Undefined when the shown view has
 * no ranges (the overview or a sample), so every key counts. An element with no zones has
 * none, so no key plays.
 */
export function getViewSplits(
    view: BankEditView,
    views: BankViews
): KeySplit[] | undefined {
    if (view === "info") {
        return undefined;
    }
    const id = getObjectId(view);
    if (view instanceof BasicPreset) {
        const preset = views.presets.get(id);
        return preset ? getPresetSplits(preset, views) : undefined;
    }
    if (view instanceof BasicInstrument) {
        const instrument = views.instruments.get(id);
        return instrument ? getInstrumentSplits(instrument) : undefined;
    }
    return undefined;
}
