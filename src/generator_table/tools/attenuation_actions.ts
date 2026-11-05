import {
    BasicInstrument,
    type BasicPreset,
    type BasicZone,
    GeneratorTypes
} from "spessasynth_core";
import { SetGeneratorAction } from "../cell/set_generator_action.ts";
import { clamp, getGeneratorRange } from "../generator_range.ts";

const ATTENUATION = GeneratorTypes.initialAttenuation;

/**
 * The lowest and highest attenuation the zones of the elements play with, in centibels as
 * stored. Undefined when the elements have no zones.
 */
export interface AttenuationStats {
    lowest: number;
    highest: number;
    min: number;
    max: number;
}

/**
 * The attenuation each zone plays with: its own, else the global zone's, else 0 (the default
 * for instruments, and no offset for presets). The global zone counts too when it sets one.
 */
function getPlayedAttenuations(element: BasicPreset | BasicInstrument) {
    const global = element.globalZone.getGenerator(ATTENUATION, null);
    const values = element.zones.map(
        (zone) => zone.getGenerator(ATTENUATION, null) ?? global ?? 0
    );
    if (global !== null) {
        values.push(global);
    }
    return values;
}

export function getAttenuationStats(
    elements: readonly (BasicPreset | BasicInstrument)[]
): AttenuationStats | undefined {
    const values = elements.flatMap((e) =>
        e.zones.length > 0 ? getPlayedAttenuations(e) : []
    );
    const [first] = elements;
    if (!first || values.length === 0) {
        return undefined;
    }
    const { min, max } = getGeneratorRange(
        ATTENUATION,
        first instanceof BasicInstrument
    );
    return {
        lowest: Math.min(...values),
        highest: Math.max(...values),
        min,
        max
    };
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
 * a global value and the zones that override it, or each zone when nothing sets it.
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
            set(element, element.globalZone, global, global + offset);
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
