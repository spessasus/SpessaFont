import {
    GeneratorLimits,
    GeneratorTypes,
    type GeneratorType
} from "spessasynth_core";

/**
 * SF2 stores every generator in 16 bits, so a larger value saves as another number.
 */
const INT16_MIN = -32_768;
const INT16_MAX = 32_767;

/**
 * Envelope and LFO times, as timecents a preset adds to the instrument.
 */
const PRESET_TIME_RANGE = 21_000;

/**
 * How far a preset zone may move a generator in either direction, where that is not the span of
 * the instrument range. Core keeps no preset ranges (CORE_WISHLIST.md, rejected item 2), so
 * these are the editor's own. The values are the ones core 4.4.7 had.
 */
const PRESET_RANGES: Partial<Record<GeneratorType, number>> = {
    [GeneratorTypes.initialFilterFc]: 21_000,
    [GeneratorTypes.fineTune]: 198,
    [GeneratorTypes.delayModLFO]: PRESET_TIME_RANGE,
    [GeneratorTypes.freqModLFO]: PRESET_TIME_RANGE,
    [GeneratorTypes.delayVibLFO]: PRESET_TIME_RANGE,
    [GeneratorTypes.freqVibLFO]: PRESET_TIME_RANGE,
    [GeneratorTypes.delayModEnv]: PRESET_TIME_RANGE,
    [GeneratorTypes.attackModEnv]: PRESET_TIME_RANGE,
    [GeneratorTypes.holdModEnv]: PRESET_TIME_RANGE,
    [GeneratorTypes.decayModEnv]: PRESET_TIME_RANGE,
    [GeneratorTypes.releaseModEnv]: PRESET_TIME_RANGE,
    [GeneratorTypes.delayVolEnv]: PRESET_TIME_RANGE,
    [GeneratorTypes.attackVolEnv]: PRESET_TIME_RANGE,
    [GeneratorTypes.holdVolEnv]: PRESET_TIME_RANGE,
    [GeneratorTypes.decayVolEnv]: PRESET_TIME_RANGE,
    [GeneratorTypes.releaseVolEnv]: PRESET_TIME_RANGE
};

/**
 * The range of a generator in an instrument or a preset zone. A preset offset may span the
 * whole instrument range in either direction, unless `PRESET_RANGES` says otherwise. Every
 * range is kept to 16 bits: the address offsets in core go up to 32768 (CORE_WISHLIST.md,
 * item 20), and a preset's span can be twice an instrument range.
 */
export function getGeneratorRange(
    generator: GeneratorType,
    isInstrument: boolean
) {
    const { min, max } = GeneratorLimits[generator];
    if (isInstrument) {
        return { min: Math.max(INT16_MIN, min), max: Math.min(INT16_MAX, max) };
    }
    const range = PRESET_RANGES[generator] ?? max - min;
    return {
        min: Math.max(INT16_MIN, -range),
        max: Math.min(INT16_MAX, range)
    };
}

/**
 * The value an unset generator plays with. An unset preset generator adds nothing to the
 * instrument, so it is 0 there.
 */
export function getGeneratorDefault(
    generator: GeneratorType,
    isInstrument: boolean
) {
    return isInstrument ? GeneratorLimits[generator].def : 0;
}

/**
 * Keeps a value inside the range.
 */
export function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}
