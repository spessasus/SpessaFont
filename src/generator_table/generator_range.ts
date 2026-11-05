import { GeneratorLimits, type GeneratorType } from "spessasynth_core";

/**
 * SF2 stores every generator in 16 bits, so a larger value saves as another number.
 */
const INT16_MIN = -32_768;
const INT16_MAX = 32_767;

/**
 * The range of a generator in an instrument or a preset zone.
 * spessasynth_core 4.4.5 has no preset ranges for generators 61 to 88, so a preset offset there
 * may span the whole instrument range in either direction. Preset ranges in core remove this.
 * Core also allows exclusive classes up to 99999, which do not fit 16 bits, so every range is
 * kept to 16 bits here (see CORE_WISHLIST.md).
 */
export function getGeneratorRange(
    generator: GeneratorType,
    isInstrument: boolean
) {
    const { min, max, presetMin, presetMax } = GeneratorLimits[generator];
    if (isInstrument) {
        return { min: Math.max(INT16_MIN, min), max: Math.min(INT16_MAX, max) };
    }
    const span = max - min;
    return {
        min: Math.max(INT16_MIN, presetMin ?? -span),
        max: Math.min(INT16_MAX, presetMax ?? span)
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
