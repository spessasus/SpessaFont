import { GeneratorLimits, type GeneratorType } from "spessasynth_core";

/**
 * The range of a generator in an instrument or a preset zone.
 * spessasynth_core 4.4.5 has no preset ranges for generators 61 to 88, so a preset offset there
 * may span the whole instrument range in either direction. Preset ranges in core remove this.
 */
export function getGeneratorRange(
    generator: GeneratorType,
    isInstrument: boolean
) {
    const { min, max, presetMin, presetMax } = GeneratorLimits[generator];
    if (isInstrument) {
        return { min, max };
    }
    const span = max - min;
    return { min: presetMin ?? -span, max: presetMax ?? span };
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
