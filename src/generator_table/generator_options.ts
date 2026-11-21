import { type GeneratorType, GeneratorTypes } from "spessasynth_core";
import type { ZoneView } from "../core_backend/entity_views.ts";
import { isSF2LoopingMode } from "../core_backend/sfe_data.ts";

const SWITCH_OPTIONS = [
    { value: 0, label: "soundBankLocale.switchStates.off" },
    { value: 1, label: "soundBankLocale.switchStates.on" }
] as const;

const LFO_WAVEFORM_OPTIONS = [
    { value: 0, label: "soundBankLocale.lfoWaveforms.triangle" },
    { value: 1, label: "soundBankLocale.lfoWaveforms.sawtooth" },
    { value: 2, label: "soundBankLocale.lfoWaveforms.sine" },
    { value: 3, label: "soundBankLocale.lfoWaveforms.square" }
] as const;

const ALTERNATING_LOOP = 4;

/**
 * Generators that pick one of a few values, shown as a select instead of a number.
 * The labels are locale keys, spelled out so they stay type-checked.
 */
const GENERATOR_OPTIONS = {
    [GeneratorTypes.sampleModes]: [
        { value: 0, label: "soundBankLocale.loopingModes.noLoop" },
        { value: 1, label: "soundBankLocale.loopingModes.loop" },
        { value: 2, label: "soundBankLocale.loopingModes.startOnRelease" },
        { value: 3, label: "soundBankLocale.loopingModes.loopUntilRelease" },
        {
            value: ALTERNATING_LOOP,
            label: "soundBankLocale.loopingModes.alternating"
        }
    ],
    [GeneratorTypes.filterType]: [
        { value: 0, label: "soundBankLocale.filterTypes.lowpass" },
        { value: 1, label: "soundBankLocale.filterTypes.highpass" },
        { value: 2, label: "soundBankLocale.filterTypes.bandpass" },
        { value: 3, label: "soundBankLocale.filterTypes.peak" },
        { value: 4, label: "soundBankLocale.filterTypes.notch" }
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

/**
 * The options of a generator that picks one of a few values.
 */
export type GeneratorOptions = readonly NonNullable<
    ReturnType<typeof getGeneratorOptions>
>[number][];

/**
 * The looping modes SF2 stores, without the alternating loop. Filtered once, so the cells'
 * options keep their identity.
 */
const SF2_LOOPING_MODES: GeneratorOptions = GENERATOR_OPTIONS[
    GeneratorTypes.sampleModes
].filter((o) => isSF2LoopingMode(o.value));

/**
 * The values the editor offers for a generator. SF2 mode leaves out what only SFe stores,
 * unless every zone the edit sets has it already, which would show as unset otherwise. So it
 * never spreads to another zone.
 * @param zones the zones a pick sets
 */
export function getShownGeneratorOptions(
    generator: GeneratorType,
    isSFe: boolean,
    zones: readonly ZoneView[]
): GeneratorOptions | undefined {
    // The only SFe looping mode with an option is the alternating loop, which SF2 mode lets a
    // pick set only on zones that hold it
    const hasAlternatingLoop = () =>
        zones.length > 0 &&
        zones.every((z) =>
            z.generators.some(
                (g) =>
                    g.type === GeneratorTypes.sampleModes &&
                    g.value === ALTERNATING_LOOP
            )
        );
    return !isSFe &&
        generator === GeneratorTypes.sampleModes &&
        !hasAlternatingLoop()
        ? SF2_LOOPING_MODES
        : getGeneratorOptions(generator);
}
