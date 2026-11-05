import {
    BasicInstrument,
    BasicInstrumentZone,
    type BasicPreset,
    type BasicZone,
    GeneratorTypes,
    type GenericRange
} from "spessasynth_core";
import { type GeneratorRowType, identity } from "../generator_row_type.ts";
import { SetGeneratorAction } from "../cell/set_generator_action.ts";
import { parseGeneratorText } from "../cell/parse_generator_text.ts";
import { getGeneratorRange } from "../generator_range.ts";
import {
    getPlayedGenerator,
    getPlayedRange,
    isPlayedOff
} from "../played_value.ts";
import { getGeneratorOptions } from "../generator_options.ts";
import { isRangeGenerator } from "../cell/range_generator.ts";
import { isOffsetGenerator } from "../cell/offset_generator.ts";
import { getRangeMean } from "./key_curve.ts";

export type CurveOperation = "replace" | "add" | "multiply";

export interface KeyCurveSettings {
    row: GeneratorRowType;
    operation: CurveOperation;
    /**
     * The curve's range, in what the row shows, or a factor for multiply.
     */
    min: number;
    max: number;
    /**
     * The curve from 0 to 1 at each key.
     */
    values: readonly number[];
    /**
     * Only zones whose velocity range overlaps this one change, all when undefined.
     */
    velocity: GenericRange | undefined;
}

/**
 * Whether a curve over the keys makes sense for the row: a plain number, not a range, an
 * option, an exclusive class or a sample offset.
 */
export function isCurveRow({ generator }: GeneratorRowType) {
    return (
        !isRangeGenerator(generator) &&
        !isOffsetGenerator(generator) &&
        !getGeneratorOptions(generator) &&
        generator !== GeneratorTypes.exclusiveClass
    );
}

/**
 * Whether the zone is in the velocity filter, with the velocities it plays.
 */
export function isInVelocity(
    element: BasicPreset | BasicInstrument,
    zone: BasicZone,
    velocity: GenericRange | undefined
) {
    if (!velocity) {
        return true;
    }
    const { min, max } = getPlayedRange(element, zone, GeneratorTypes.velRange);
    return min <= velocity.max && max >= velocity.min;
}

const isSameRange = (a: GenericRange, b: GenericRange) =>
    a.min === b.min && a.max === b.max;

/**
 * The other half of a stereo pair: the zone of the linked sample that plays the same keys and
 * velocities. Undefined for presets and mono zones.
 */
function findStereoPartner(
    element: BasicPreset | BasicInstrument,
    zone: BasicZone
) {
    if (
        !(element instanceof BasicInstrument) ||
        !(zone instanceof BasicInstrumentZone)
    ) {
        return undefined;
    }
    const linked = zone.sample.linkedSample;
    return element.zones.find(
        (other) =>
            linked !== undefined &&
            other.sample === linked &&
            isSameRange(other.keyRange, zone.keyRange) &&
            isSameRange(other.velRange, zone.velRange)
    );
}

/**
 * Sets the row's generator in every zone (not the global zone) of the elements from the curve:
 * each zone takes the curve's mean over the keys it plays, then replaces, adds to or multiplies
 * what it plays now (its own value, else the global one, else the default). A replaced pan
 * keeps each half of a stereo pair as far from the pair's center as before, so the pair stays
 * stereo. A zone that would get the value it already plays stays as it is.
 */
export function createKeyCurveActions(
    elements: readonly (BasicPreset | BasicInstrument)[],
    { row, operation, min, max, values, velocity }: KeyCurveSettings
) {
    const { generator, fromGenerator = identity, toGenerator = identity } = row;
    const actions = new Array<SetGeneratorAction>();
    for (const element of elements) {
        const range = getGeneratorRange(
            generator,
            element instanceof BasicInstrument
        );
        for (const zone of element.zones) {
            if (!isInVelocity(element, zone, velocity)) {
                continue;
            }
            const played = getPlayedGenerator(element, zone, generator);
            // An unset fixed key or velocity has no number to add to or multiply
            if (operation !== "replace" && isPlayedOff(generator, played)) {
                continue;
            }
            const keys = getPlayedRange(element, zone, GeneratorTypes.keyRange);
            const curve =
                min + getRangeMean(values, keys.min, keys.max) * (max - min);
            const shown = fromGenerator(played);
            let target = curve;
            if (operation === "add") {
                target = shown + curve;
            } else if (operation === "multiply") {
                target = shown * curve;
            } else if (generator === GeneratorTypes.pan) {
                const partner = findStereoPartner(element, zone);
                if (partner) {
                    const partnerShown = fromGenerator(
                        getPlayedGenerator(element, partner, generator)
                    );
                    target = curve + (shown - partnerShown) / 2;
                }
            }
            // Only the logarithmic rows (seconds, Hz) have no value below zero, and there
            // the smallest one is the closest
            const raw =
                parseGeneratorText(target, toGenerator, range.min, range.max) ??
                range.min;
            if (raw !== played) {
                actions.push(
                    new SetGeneratorAction(
                        element,
                        zone,
                        generator,
                        zone.getGenerator(generator, null),
                        raw
                    )
                );
            }
        }
    }
    return actions;
}
