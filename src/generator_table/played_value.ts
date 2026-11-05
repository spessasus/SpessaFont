import {
    BasicInstrument,
    BasicInstrumentZone,
    type BasicPreset,
    type BasicZone,
    type GeneratorType,
    GeneratorTypes,
    type GenericRange
} from "spessasynth_core";
import { getGeneratorDefault } from "./generator_range.ts";
import type { RangeGenerator } from "./cell/range_generator.ts";

/**
 * The value a zone of the element plays a generator with, the way spessasynth_core picks it:
 * the zone's own value, else the global zone's, else the default. Preset values are offsets
 * added to the instrument, so an unset one is 0 there. An instrument zone without a root key
 * plays its sample's original key. For handlers and actions, as it reads core objects.
 */
export function getPlayedGenerator(
    element: BasicPreset | BasicInstrument,
    zone: BasicZone,
    generator: GeneratorType
) {
    const value =
        zone.getGenerator(generator, null) ??
        element.globalZone.getGenerator(generator, null);
    const isSampleKey =
        generator === GeneratorTypes.overridingRootKey &&
        zone instanceof BasicInstrumentZone &&
        (value === null || value < 0);
    return isSampleKey
        ? zone.sample.originalKey
        : (value ??
              getGeneratorDefault(
                  generator,
                  element instanceof BasicInstrument
              ));
}

/**
 * Whether a played value is "off" rather than a number to start a relative edit from:
 * a fixed key or velocity of -1 means the zone uses the played key or velocity.
 */
export function isPlayedOff(generator: GeneratorType, played: number) {
    return (
        (generator === GeneratorTypes.keyNum ||
            generator === GeneratorTypes.velocity) &&
        played < 0
    );
}

/**
 * The keys (or velocities) a zone of the element plays: its own range, else the global
 * zone's, else all of them. Never unset.
 */
export function getPlayedRange(
    element: BasicPreset | BasicInstrument,
    zone: BasicZone,
    generator: RangeGenerator
): GenericRange {
    const pick = (z: BasicZone) =>
        generator === GeneratorTypes.keyRange ? z.keyRange : z.velRange;
    const own = pick(zone);
    const range = own.min === -1 ? pick(element.globalZone) : own;
    return range.min === -1
        ? { min: 0, max: 127 }
        : { min: range.min, max: range.max };
}
