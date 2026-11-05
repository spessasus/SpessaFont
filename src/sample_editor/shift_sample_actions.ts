import type { BasicSample } from "spessasynth_core";
import { EditSampleAction } from "./edit_sample_action.ts";
import { getStereoGroup, isLoopShared } from "./sample_audio.ts";
import { clamp } from "../generator_table/generator_range.ts";

export type ShiftableProperty =
    "originalKey" | "pitchCorrection" | "loopStart" | "loopEnd";

export type ShiftOperation = "add" | "multiply";

export interface SampleShift {
    property: ShiftableProperty;
    operation: ShiftOperation;
    value: number;
}

/**
 * The range a property may take in this sample. A loop point stays on its side of the other,
 * unchanged one, and the loop keeps at least one frame where the sample has room for it.
 */
function getPropertyRange(
    sample: BasicSample,
    length: number,
    property: ShiftableProperty
) {
    switch (property) {
        case "originalKey": {
            return { min: 0, max: 127 };
        }

        case "pitchCorrection": {
            return { min: -99, max: 99 };
        }

        case "loopStart": {
            return { min: 0, max: Math.max(0, sample.loopEnd - 1) };
        }

        case "loopEnd": {
            return {
                min: Math.min(length, sample.loopStart + 1),
                max: length
            };
        }
    }
}

/**
 * The samples a shift changes. A pair stays in tune, so the other half of a stereo pair follows
 * for the root key and correction, and for loop points when both halves share one loop (as the
 * sample editor does). Each sample comes once.
 */
function getShiftedSamples(
    samples: Iterable<BasicSample>,
    property: ShiftableProperty
) {
    const result = new Set<BasicSample>();
    const isLoop = property === "loopStart" || property === "loopEnd";
    for (const sample of samples) {
        result.add(sample);
        const [, partner] = getStereoGroup(sample);
        if (partner && (!isLoop || isLoopShared(sample, partner))) {
            result.add(partner);
        }
    }
    return result;
}

/**
 * Adds a number to one property of the samples, or multiplies it, rounded to whole values and
 * kept in range. `clamped` counts the values that had to be kept in range.
 * @param samples the samples
 * @param shift what to change and how
 * @param getLength the length of a sample, which the store knows best (its views)
 */
export function createShiftActions(
    samples: Iterable<BasicSample>,
    { property, operation, value }: SampleShift,
    getLength: (sample: BasicSample) => number = (s) => s.sampleLength
) {
    const actions = new Array<EditSampleAction<ShiftableProperty>>();
    let clamped = 0;
    for (const sample of getShiftedSamples(samples, property)) {
        const old = sample[property];
        const shifted = Math.round(
            operation === "add" ? old + value : old * value
        );
        const { min, max } = getPropertyRange(
            sample,
            getLength(sample),
            property
        );
        const next = clamp(shifted, min, max);
        if (next !== shifted) {
            clamped++;
        }
        if (next !== old) {
            actions.push(new EditSampleAction(sample, property, old, next));
        }
    }
    return { actions, clamped };
}
