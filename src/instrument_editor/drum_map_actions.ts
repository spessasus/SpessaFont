import {
    type BasicInstrument,
    type BasicInstrumentZone,
    GeneratorTypes
} from "spessasynth_core";
import { SetRangeAction } from "../generator_table/cell/set_range_action.ts";
import { SetGeneratorAction } from "../generator_table/cell/set_generator_action.ts";

/**
 * The key GM drum kits start on, the bass drum.
 */
export const DRUM_MAP_START_KEY = 35;

/**
 * Puts the zones on consecutive keys from `startKey` in zone order, one key each, like a drum
 * kit. Each zone plays its sample unpitched on its key (the root key is set to that key).
 * The two halves of a stereo pair next to each other share a key. Zones past key 127 are left
 * as they are.
 */
export function createDrumMapActions(
    instrument: BasicInstrument,
    startKey: number
) {
    const actions = new Array<SetRangeAction | SetGeneratorAction>();
    let key = startKey - 1;
    let previous: BasicInstrumentZone | undefined;
    for (const zone of instrument.zones) {
        const isPartner = previous?.sample.linkedSample === zone.sample;
        if (!isPartner) key++;
        previous = zone;
        if (key > 127) break;
        actions.push(
            new SetRangeAction(
                instrument,
                zone,
                GeneratorTypes.keyRange,
                zone.keyRange,
                { min: key, max: key }
            ),
            new SetGeneratorAction(
                instrument,
                zone,
                GeneratorTypes.overridingRootKey,
                zone.getGenerator(GeneratorTypes.overridingRootKey, null),
                key
            )
        );
    }
    return actions;
}
