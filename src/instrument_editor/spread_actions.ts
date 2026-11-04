import {
    type BasicInstrument,
    type BasicInstrumentZone,
    GeneratorTypes
} from "spessasynth_core";
import { SetRangeAction } from "../generator_table/cell/set_range_action.ts";

/**
 * The key a zone plays its sample at: its own root key, or the sample's original key.
 */
function getZoneRootKey(zone: BasicInstrumentZone) {
    const override = zone.getGenerator(GeneratorTypes.overridingRootKey, -1);
    return override >= 0 ? override : zone.sample.originalKey;
}

/**
 * Gives each zone the keys closest to its root key: the ranges split halfway between
 * neighbouring root keys, and the lowest and highest zones reach the ends of the keyboard.
 * Zones with the same root key (velocity layers, stereo halves) share a range.
 */
export function createSpreadActions(instrument: BasicInstrument) {
    const keys = [
        ...new Set(instrument.zones.map((z) => getZoneRootKey(z)))
    ].toSorted((a, b) => a - b);
    const ranges = new Map(
        keys.map((key, i) => {
            const min = i === 0 ? 0 : Math.floor((keys[i - 1] + key) / 2) + 1;
            const max =
                i === keys.length - 1
                    ? 127
                    : Math.floor((key + keys[i + 1]) / 2);
            return [key, { min, max }];
        })
    );
    return instrument.zones.flatMap((zone) => {
        const range = ranges.get(getZoneRootKey(zone));
        if (
            !range ||
            (zone.keyRange.min === range.min && zone.keyRange.max === range.max)
        ) {
            return [];
        }
        return [
            new SetRangeAction(
                instrument,
                zone,
                GeneratorTypes.keyRange,
                zone.keyRange,
                range
            )
        ];
    });
}
