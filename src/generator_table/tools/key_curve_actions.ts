import {
    BasicInstrument,
    type BasicInstrumentZone,
    type BasicPreset,
    type BasicPresetZone,
    GeneratorTypes,
    type GenericRange
} from "spessasynth_core";
import type { GeneratorRowType } from "../generator_row_type.ts";
import { SetGeneratorAction } from "../cell/set_generator_action.ts";
import { parseGeneratorText } from "../cell/parse_generator_text.ts";
import { getGeneratorDefault, getGeneratorRange } from "../generator_range.ts";
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

const identity = (v: number) => v;

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
 * A range as played, an unset one covering everything.
 */
export function getPlayedRange(range: GenericRange) {
    return range.min === -1 ? { min: 0, max: 127 } : range;
}

/**
 * Whether the zone is in the velocity filter.
 */
export function isInVelocity(
    zone: BasicPresetZone | BasicInstrumentZone,
    velocity: GenericRange | undefined
) {
    if (!velocity) {
        return true;
    }
    const { min, max } = getPlayedRange(zone.velRange);
    return min <= velocity.max && max >= velocity.min;
}

/**
 * Sets the row's generator in every zone (not the global zone) of the elements from the curve:
 * each zone takes the curve's mean over its keys, then replaces, adds to or multiplies what it
 * shows now (its own value, else the global one, else the default).
 */
export function createKeyCurveActions(
    elements: readonly (BasicPreset | BasicInstrument)[],
    { row, operation, min, max, values, velocity }: KeyCurveSettings
) {
    const { generator, fromGenerator = identity, toGenerator = identity } = row;
    const actions = new Array<SetGeneratorAction>();
    for (const element of elements) {
        const isInstrument = element instanceof BasicInstrument;
        const range = getGeneratorRange(generator, isInstrument);
        const global = element.globalZone.getGenerator(generator, null);
        for (const zone of element.zones) {
            if (!isInVelocity(zone, velocity)) {
                continue;
            }
            const keys = getPlayedRange(zone.keyRange);
            const curve =
                min + getRangeMean(values, keys.min, keys.max) * (max - min);
            const own = zone.getGenerator(generator, null);
            const shown = fromGenerator(
                own ?? global ?? getGeneratorDefault(generator, isInstrument)
            );
            let target = curve;
            if (operation === "add") {
                target = shown + curve;
            } else if (operation === "multiply") {
                target = shown * curve;
            }
            const raw = parseGeneratorText(
                target,
                toGenerator,
                range.min,
                range.max
            );
            if (raw !== undefined && raw !== own) {
                actions.push(
                    new SetGeneratorAction(element, zone, generator, own, raw)
                );
            }
        }
    }
    return actions;
}
