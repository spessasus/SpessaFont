import { type GeneratorType, GeneratorTypes as G } from "spessasynth_core";

export const GENERATOR_GROUPS = {
    rangeTuning: "rangeTuning",
    volume: "volume",
    filter: "filter",
    volumeEnvelope: "volumeEnvelope",
    modulationEnvelope: "modulationEnvelope",
    modulationEnvelope2: "modulationEnvelope2",
    modulationLFO: "modulationLFO",
    vibratoLFO: "vibratoLFO",
    effects: "effects",
    sample: "sample"
} as const;
export type GeneratorGroup =
    (typeof GENERATOR_GROUPS)[keyof typeof GENERATOR_GROUPS];

export const PHONE_GRID_MODES = {
    grid: "grid",
    oneZone: "oneZone"
} as const;
export type PhoneGridMode =
    (typeof PHONE_GRID_MODES)[keyof typeof PHONE_GRID_MODES];

export function isPhoneGridMode(value: unknown): value is PhoneGridMode {
    return (Object.values(PHONE_GRID_MODES) as unknown[]).includes(value);
}

export function isGeneratorGroup(value: unknown): value is GeneratorGroup {
    return (Object.values(GENERATOR_GROUPS) as unknown[]).includes(value);
}

/**
 * The order the phone grid shows the groups in.
 */
export const GENERATOR_GROUP_ORDER = Object.values(
    GENERATOR_GROUPS
) as readonly GeneratorGroup[];

/**
 * The generators of each group. SFE generators sit inside their musical groups.
 */
export const GROUP_GENERATORS: Record<
    GeneratorGroup,
    readonly GeneratorType[]
> = {
    rangeTuning: [
        G.keyRange,
        G.velRange,
        G.coarseTune,
        G.fineTune,
        G.scaleTuning
    ],
    volume: [G.initialAttenuation, G.amplitude, G.pan],
    filter: [G.initialFilterFc, G.initialFilterQ, G.maxFilterFc],
    volumeEnvelope: [
        G.delayVolEnv,
        G.attackVolEnv,
        G.holdVolEnv,
        G.decayVolEnv,
        G.sustainVolEnv,
        G.decay2VolEnv,
        G.sustain2VolEnv,
        G.releaseVolEnv,
        G.keyNumToVolEnvHold,
        G.keyNumToVolEnvDecay
    ],
    modulationEnvelope: [
        G.delayModEnv,
        G.attackModEnv,
        G.holdModEnv,
        G.decayModEnv,
        G.sustainModEnv,
        G.releaseModEnv,
        G.modEnvToFilterFc,
        G.modEnvToPitch,
        G.keyNumToModEnvHold,
        G.keyNumToModEnvDecay
    ],
    modulationEnvelope2: [
        G.delayModEnv2,
        G.attackModEnv2,
        G.holdModEnv2,
        G.decayModEnv2,
        G.sustainModEnv2,
        G.releaseModEnv2,
        G.modEnv2ToFilterFc,
        G.modEnv2ToPitch,
        G.keyNumToModEnv2Hold,
        G.keyNumToModEnv2Decay
    ],
    modulationLFO: [
        G.delayModLFO,
        G.fadeModLFO,
        G.freqModLFO,
        G.modLfoRate,
        G.modLfoWaveform,
        G.modLfoStartPhase,
        G.modLfoToPitch,
        G.modLfoToFilterFc,
        G.modLfoToVolume,
        G.modLfoAmplitudeDepth
    ],
    vibratoLFO: [
        G.delayVibLFO,
        G.fadeVibLFO,
        G.freqVibLFO,
        G.vibLfoRate,
        G.vibLfoWaveform,
        G.vibLfoStartPhase,
        G.vibLfoToPitch,
        G.vibLfoToFilterFc,
        G.vibLfoToVolume,
        G.vibLfoAmplitudeDepth
    ],
    effects: [
        G.chorusEffectsSend,
        G.reverbEffectsSend,
        G.delayVoice,
        G.ignoreNoteOff
    ],
    sample: [
        G.sampleModes,
        G.overridingRootKey,
        G.exclusiveClass,
        G.keyNum,
        G.velocity,
        G.startAddrsOffset,
        G.endAddrOffset,
        G.startloopAddrsOffset,
        G.endloopAddrsOffset
    ]
};

export const GROUP_OF_GENERATOR: ReadonlyMap<GeneratorType, GeneratorGroup> =
    new Map(
        GENERATOR_GROUP_ORDER.flatMap((group) =>
            GROUP_GENERATORS[group].map(
                (generator) => [generator, group] as const
            )
        )
    );

export const GENERATOR_GROUP_LABELS = {
    rangeTuning: "phoneLocale.groups.rangeTuning",
    volume: "phoneLocale.groups.volume",
    filter: "phoneLocale.groups.filter",
    volumeEnvelope: "phoneLocale.groups.volumeEnvelope",
    modulationEnvelope: "phoneLocale.groups.modulationEnvelope",
    modulationEnvelope2: "phoneLocale.groups.modulationEnvelope2",
    modulationLFO: "phoneLocale.groups.modulationLFO",
    vibratoLFO: "phoneLocale.groups.vibratoLFO",
    effects: "phoneLocale.groups.effects",
    sample: "phoneLocale.groups.sample"
} as const satisfies Record<GeneratorGroup, string>;
