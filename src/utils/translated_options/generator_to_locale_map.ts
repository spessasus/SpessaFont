import { GeneratorTypes } from "spessasynth_core";
import type { GeneratorLocale } from "../../locale/locale_en/generator.ts";

type GeneratorLocaleKey = `generatorLocale.${keyof typeof GeneratorLocale}`;

export const generatorLocaleMap: Record<number, GeneratorLocaleKey> = {
    [GeneratorTypes.keyRange]: "generatorLocale.keyRange",
    [GeneratorTypes.velRange]: "generatorLocale.velocityRange",
    [GeneratorTypes.sampleModes]: "generatorLocale.loopingMode",
    [GeneratorTypes.overridingRootKey]: "generatorLocale.overridingRootKey",
    [GeneratorTypes.scaleTuning]: "generatorLocale.scaleTuning",
    [GeneratorTypes.exclusiveClass]: "generatorLocale.exclusiveClass",
    [GeneratorTypes.ignoreNoteOff]: "generatorLocale.ignoreNoteOff",
    [GeneratorTypes.delayVoice]: "generatorLocale.voiceDelay",
    [GeneratorTypes.keyNum]: "generatorLocale.fixedKey",
    [GeneratorTypes.velocity]: "generatorLocale.fixedVelocity",

    [GeneratorTypes.initialAttenuation]: "generatorLocale.attenuation",
    [GeneratorTypes.amplitude]: "generatorLocale.amplitude",
    [GeneratorTypes.pan]: "generatorLocale.pan",

    [GeneratorTypes.coarseTune]: "generatorLocale.semitoneTuning",
    [GeneratorTypes.fineTune]: "generatorLocale.centTuning",

    [GeneratorTypes.initialFilterFc]: "generatorLocale.filterCutoff",
    [GeneratorTypes.initialFilterQ]: "generatorLocale.filterResonance",
    [GeneratorTypes.maxFilterFc]: "generatorLocale.filterCutoffLimit",

    [GeneratorTypes.delayVolEnv]: "generatorLocale.volEnvDelay",
    [GeneratorTypes.attackVolEnv]: "generatorLocale.volEnvAttack",
    [GeneratorTypes.holdVolEnv]: "generatorLocale.volEnvHold",
    [GeneratorTypes.decayVolEnv]: "generatorLocale.volEnvDecay",
    [GeneratorTypes.sustainVolEnv]: "generatorLocale.volEnvSustain",
    [GeneratorTypes.decay2VolEnv]: "generatorLocale.volEnvDecay2",
    [GeneratorTypes.sustain2VolEnv]: "generatorLocale.volEnvSustain2",
    [GeneratorTypes.releaseVolEnv]: "generatorLocale.volEnvRelease",

    [GeneratorTypes.keyNumToVolEnvHold]: "generatorLocale.keyToVolEnvHold",
    [GeneratorTypes.keyNumToVolEnvDecay]: "generatorLocale.keyToVolEnvDecay",

    [GeneratorTypes.delayModEnv]: "generatorLocale.modEnvDelay",
    [GeneratorTypes.attackModEnv]: "generatorLocale.modEnvAttack",
    [GeneratorTypes.holdModEnv]: "generatorLocale.modEnvHold",
    [GeneratorTypes.decayModEnv]: "generatorLocale.modEnvDecay",
    [GeneratorTypes.sustainModEnv]: "generatorLocale.modEnvSustain",
    [GeneratorTypes.releaseModEnv]: "generatorLocale.modEnvRelease",
    [GeneratorTypes.modEnvToFilterFc]: "generatorLocale.modEnvToFilter",
    [GeneratorTypes.modEnvToPitch]: "generatorLocale.modEnvToPitch",

    [GeneratorTypes.keyNumToModEnvHold]: "generatorLocale.keyToModEnvHold",
    [GeneratorTypes.keyNumToModEnvDecay]: "generatorLocale.keyToModEnvDecay",

    [GeneratorTypes.delayModEnv2]: "generatorLocale.modEnv2Delay",
    [GeneratorTypes.attackModEnv2]: "generatorLocale.modEnv2Attack",
    [GeneratorTypes.holdModEnv2]: "generatorLocale.modEnv2Hold",
    [GeneratorTypes.decayModEnv2]: "generatorLocale.modEnv2Decay",
    [GeneratorTypes.sustainModEnv2]: "generatorLocale.modEnv2Sustain",
    [GeneratorTypes.releaseModEnv2]: "generatorLocale.modEnv2Release",
    [GeneratorTypes.modEnv2ToFilterFc]: "generatorLocale.modEnv2ToFilter",
    [GeneratorTypes.modEnv2ToPitch]: "generatorLocale.modEnv2ToPitch",
    [GeneratorTypes.keyNumToModEnv2Hold]: "generatorLocale.keyToModEnv2Hold",
    [GeneratorTypes.keyNumToModEnv2Decay]: "generatorLocale.keyToModEnv2Decay",

    [GeneratorTypes.delayModLFO]: "generatorLocale.modLfoDelay",
    [GeneratorTypes.fadeModLFO]: "generatorLocale.modLfoFade",
    [GeneratorTypes.freqModLFO]: "generatorLocale.modLfoFrequency",
    [GeneratorTypes.modLfoRate]: "generatorLocale.modLfoRateOffset",
    [GeneratorTypes.modLfoWaveform]: "generatorLocale.modLfoWaveform",
    [GeneratorTypes.modLfoStartPhase]: "generatorLocale.modLfoStartPhase",
    [GeneratorTypes.modLfoToPitch]: "generatorLocale.modLfoToPitch",
    [GeneratorTypes.modLfoToFilterFc]: "generatorLocale.modLfoToFilter",
    [GeneratorTypes.modLfoToVolume]: "generatorLocale.modLfoToVolume",
    [GeneratorTypes.modLfoAmplitudeDepth]: "generatorLocale.modLfoToAmplitude",

    [GeneratorTypes.delayVibLFO]: "generatorLocale.vibLfoDelay",
    [GeneratorTypes.fadeVibLFO]: "generatorLocale.vibLfoFade",
    [GeneratorTypes.freqVibLFO]: "generatorLocale.vibLfoFrequency",
    [GeneratorTypes.vibLfoRate]: "generatorLocale.vibLfoRateOffset",
    [GeneratorTypes.vibLfoWaveform]: "generatorLocale.vibLfoWaveform",
    [GeneratorTypes.vibLfoStartPhase]: "generatorLocale.vibLfoStartPhase",
    [GeneratorTypes.vibLfoToPitch]: "generatorLocale.vibLfoToPitch",
    [GeneratorTypes.vibLfoToFilterFc]: "generatorLocale.vibLfoToFilter",
    [GeneratorTypes.vibLfoToVolume]: "generatorLocale.vibLfoToVolume",
    [GeneratorTypes.vibLfoAmplitudeDepth]: "generatorLocale.vibLfoToAmplitude",

    [GeneratorTypes.chorusEffectsSend]: "generatorLocale.chorusLevel",
    [GeneratorTypes.reverbEffectsSend]: "generatorLocale.reverbLevel",

    [GeneratorTypes.startAddrsOffset]: "generatorLocale.sampleStartOffset",
    [GeneratorTypes.endAddrOffset]: "generatorLocale.sampleEndOffset",

    [GeneratorTypes.startloopAddrsOffset]: "generatorLocale.loopStartOffset",
    [GeneratorTypes.endloopAddrsOffset]: "generatorLocale.loopEndOffset"
};
