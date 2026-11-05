import {
    BasicInstrument,
    type BasicPreset,
    type BasicZone,
    GeneratorTypes
} from "spessasynth_core";
import { SetGeneratorAction } from "../cell/set_generator_action.ts";
import { clamp, getGeneratorRange } from "../generator_range.ts";
import { getPlayedGenerator } from "../played_value.ts";

const ATTENUATION = GeneratorTypes.initialAttenuation;

/**
 * The lowest and highest attenuation the zones of the elements play with, in centibels as
 * stored, and the range of the generator.
 */
export interface AttenuationStats {
    lowest: number;
    highest: number;
    min: number;
    max: number;
}

/**
 * Undefined when the elements have no zones.
 */
export function getAttenuationStats(
    elements: readonly (BasicPreset | BasicInstrument)[]
): AttenuationStats | undefined {
    const [first] = elements;
    let lowest = Infinity;
    let highest = -Infinity;
    // A loop, as spreading a large selection into Math.min overflows the stack
    for (const element of elements) {
        for (const zone of element.zones) {
            const played = getPlayedGenerator(element, zone, ATTENUATION);
            lowest = Math.min(lowest, played);
            highest = Math.max(highest, played);
        }
    }
    if (!first || lowest === Infinity) {
        return undefined;
    }
    const { min, max } = getGeneratorRange(
        ATTENUATION,
        first instanceof BasicInstrument
    );
    return { lowest, highest, min, max };
}

/**
 * The offset that can be applied to every zone without going past the range, as close to the
 * wanted one as that allows. The same offset everywhere keeps the balance.
 */
export function limitAttenuationOffset(
    { lowest, highest, min, max }: AttenuationStats,
    offset: number
) {
    const down = min - lowest;
    const up = max - highest;
    return down > up ? 0 : clamp(Math.round(offset), down, up);
}

/**
 * Shifts the attenuation of every zone of the elements by one offset, where the value lives:
 * a global value and the zones that override it, or each zone when nothing sets it. The offset
 * comes from what the zones play, so a global value that every zone overrides is kept in the
 * range on its own.
 */
export function createAttenuationActions(
    elements: readonly (BasicPreset | BasicInstrument)[],
    offset: number
) {
    const actions = new Array<SetGeneratorAction>();
    if (offset === 0) {
        return actions;
    }
    const set = (
        element: BasicPreset | BasicInstrument,
        zone: BasicZone,
        from: number | null,
        to: number
    ) => {
        actions.push(
            new SetGeneratorAction(element, zone, ATTENUATION, from, to)
        );
    };
    for (const element of elements) {
        if (element.zones.length === 0) {
            continue;
        }
        const global = element.globalZone.getGenerator(ATTENUATION, null);
        if (global !== null) {
            const { min, max } = getGeneratorRange(
                ATTENUATION,
                element instanceof BasicInstrument
            );
            const shifted = clamp(global + offset, min, max);
            if (shifted !== global) {
                set(element, element.globalZone, global, shifted);
            }
        }
        for (const zone of element.zones) {
            const own = zone.getGenerator(ATTENUATION, null);
            if (own !== null) {
                set(element, zone, own, own + offset);
            } else if (global === null) {
                set(element, zone, null, offset);
            }
        }
    }
    return actions;
}
