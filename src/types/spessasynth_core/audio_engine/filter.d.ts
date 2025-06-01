import type { Voice } from "./voice";

export class LowpassFilter {
    /**
     * Cached coefficient calculations
     * stored as cachedCoefficients[resonanceCb][currentInitialFc]
     * @type {CachedCoefficient[][]}
     * @private
     */
    private static cachedCoefficients: CachedCoefficient;
    /**
     * Filter coefficient 1
     * @type {number}
     */
    a0: number;
    /**
     * Filter coefficient 2
     * @type {number}
     */
    a1: number;
    /**
     * Filter coefficient 3
     * @type {number}
     */
    a2: number;
    /**
     * Filter coefficient 4
     * @type {number}
     */
    a3: number;
    /**
     * Filter coefficient 5
     * @type {number}
     */
    a4: number;
    /**
     * Input history 1
     * @type {number}
     */
    x1: number;
    /**
     * Input history 2
     * @type {number}
     */
    x2: number;
    /**
     * Output history 1
     * @type {number}
     */
    y1: number;
    /**
     * Output history 2
     * @type {number}
     */
    y2: number;
    /**
     * Resonance in centibels
     * @type {number}
     */
    resonanceCb: number;
    /**
     * Cutoff frequency in absolute cents
     * @type {number}
     */
    currentInitialFc: number;
    /**
     * For tracking the last cutoff frequency in the apply method, absolute cents
     * Set to infinity to force recalculation
     * @type {number}
     */
    lastTargetCutoff: number;
    /**
     * used for tracking if the filter has been initialized
     * @type {boolean}
     */
    initialized: boolean;
    /**
     * Hertz
     * @type {number}
     */
    sampleRate: number;
    /**
     * @type {number}
     */
    maxCutoff: number;

    /**
     * @param sampleRate {number}
     */
    constructor(sampleRate: number);

    /**
     * Applies a low-pass filter to the given buffer
     * @param voice {Voice} the voice we are working on
     * @param outputBuffer {Float32Array} the buffer to apply the filter to
     * @param fcExcursion {number} the addition of modenv and mod lfo in cents to the filter
     * @param smoothingFactor {number} filter's cutoff frequency smoothing factor
     */
    static apply(
        voice: Voice,
        outputBuffer: Float32Array,
        fcExcursion: number,
        smoothingFactor: number
    ): void;

    /**
     * @param filter {LowpassFilter}
     * @param cutoffCents {number}
     */
    static calculateCoefficients(
        filter: LowpassFilter,
        cutoffCents: number
    ): void;
}

export type CachedCoefficient = {
    /**
     * - Filter coefficient 1
     */
    a0: number;
    /**
     * - Filter coefficient 2
     */
    a1: number;
    /**
     * - Filter coefficient 3
     */
    a2: number;
    /**
     * - Filter coefficient 4
     */
    a3: number;
    /**
     * - Filter coefficient 5
     */
    a4: number;
};
