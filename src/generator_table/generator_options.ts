import { type GeneratorType, GeneratorTypes } from "spessasynth_core";

const SWITCH_OPTIONS = [
    { value: 0, label: "soundBankLocale.switchStates.off" },
    { value: 1, label: "soundBankLocale.switchStates.on" }
] as const;

const LFO_WAVEFORM_OPTIONS = [
    { value: 0, label: "soundBankLocale.lfoWaveforms.triangle" },
    { value: 1, label: "soundBankLocale.lfoWaveforms.sawtooth" },
    { value: 2, label: "soundBankLocale.lfoWaveforms.sine" }
] as const;

/**
 * Generators that pick one of a few values, shown as a select instead of a number.
 * The labels are locale keys, spelled out so they stay type-checked.
 */
const GENERATOR_OPTIONS = {
    [GeneratorTypes.sampleModes]: [
        { value: 0, label: "soundBankLocale.loopingModes.noLoop" },
        { value: 1, label: "soundBankLocale.loopingModes.loop" },
        { value: 2, label: "soundBankLocale.loopingModes.startOnRelease" },
        { value: 3, label: "soundBankLocale.loopingModes.loopUntilRelease" }
    ],
    [GeneratorTypes.ignoreNoteOff]: SWITCH_OPTIONS,
    [GeneratorTypes.vibLfoWaveform]: LFO_WAVEFORM_OPTIONS,
    [GeneratorTypes.modLfoWaveform]: LFO_WAVEFORM_OPTIONS
} as const;

function hasOptions(
    generator: GeneratorType
): generator is keyof typeof GENERATOR_OPTIONS {
    return Object.hasOwn(GENERATOR_OPTIONS, generator);
}

/**
 * The values a generator can pick from, or undefined for a plain number.
 */
export function getGeneratorOptions(generator: GeneratorType) {
    return hasOptions(generator) ? GENERATOR_OPTIONS[generator] : undefined;
}
