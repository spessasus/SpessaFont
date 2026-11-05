import {
    type BasicInstrument,
    type BasicInstrumentZone,
    GeneratorTypes,
    type GenericRange
} from "spessasynth_core";
import { SetRangeAction } from "../generator_table/cell/set_range_action.ts";
import { getPlayedGenerator } from "../generator_table/played_value.ts";

/**
 * The keys closest to each zone's root key (its own, the global one or the sample's): the
 * ranges split halfway between neighbouring root keys, and the lowest and highest zones reach
 * the ends of the keyboard. Zones with the same root key (velocity layers, stereo halves)
 * share a range.
 */
export function getSpreadRanges(instrument: BasicInstrument) {
    const rootKeys = new Map(
        instrument.zones.map((zone) => [
            zone,
            getPlayedGenerator(
                instrument,
                zone,
                GeneratorTypes.overridingRootKey
            )
        ])
    );
    const keys = [...new Set(rootKeys.values())].toSorted((a, b) => a - b);
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
    return new Map(
        instrument.zones.flatMap(
            (zone): [BasicInstrumentZone, GenericRange][] => {
                const key = rootKeys.get(zone);
                const range = key === undefined ? undefined : ranges.get(key);
                return range ? [[zone, range]] : [];
            }
        )
    );
}

/**
 * Gives each zone the keys closest to its root key, see `getSpreadRanges`.
 */
export function createSpreadActions(instrument: BasicInstrument) {
    const ranges = getSpreadRanges(instrument);
    return instrument.zones.flatMap((zone) => {
        const range = ranges.get(zone);
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
