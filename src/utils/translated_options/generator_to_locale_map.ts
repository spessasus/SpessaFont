import { generatorTypes } from "spessasynth_core";

export const generatorLocaleMap: Record<number, string> = {
    [generatorTypes.keyRange]: "generatorLocale.keyRange",
    [generatorTypes.velRange]: "generatorLocale.velocityRange",
    [generatorTypes.sampleModes]: "generatorLocale.loopingMode",
    [generatorTypes.overridingRootKey]: "generatorLocale.overridingRootKey",
    [generatorTypes.scaleTuning]: "generatorLocale.scaleTuning",
    [generatorTypes.exclusiveClass]: "generatorLocale.exclusiveClass",
    [generatorTypes.keyNum]: "generatorLocale.fixedKey",
    [generatorTypes.velocity]: "generatorLocale.fixedVelocity",

    [generatorTypes.initialAttenuation]: "generatorLocale.attenuation",
    [generatorTypes.pan]: "generatorLocale.pan",

    [generatorTypes.coarseTune]: "generatorLocale.semitoneTuning",
    [generatorTypes.fineTune]: "generatorLocale.centTuning",

    [generatorTypes.initialFilterFc]: "generatorLocale.filterCutoff",
    [generatorTypes.initialFilterQ]: "generatorLocale.filterResonance",

    [generatorTypes.delayVolEnv]: "generatorLocale.volEnvDelay",
    [generatorTypes.attackVolEnv]: "generatorLocale.volEnvAttack",
    [generatorTypes.holdVolEnv]: "generatorLocale.volEnvHold",
    [generatorTypes.decayVolEnv]: "generatorLocale.volEnvDecay",
    [generatorTypes.sustainVolEnv]: "generatorLocale.volEnvSustain",
    [generatorTypes.releaseVolEnv]: "generatorLocale.volEnvRelease",

    [generatorTypes.keyNumToVolEnvHold]: "generatorLocale.keyToVolEnvHold",
    [generatorTypes.keyNumToVolEnvDecay]: "generatorLocale.keyToVolEnvDecay",

    [generatorTypes.delayModEnv]: "generatorLocale.modEnvDelay",
    [generatorTypes.attackModEnv]: "generatorLocale.modEnvAttack",
    [generatorTypes.holdModEnv]: "generatorLocale.modEnvHold",
    [generatorTypes.decayModEnv]: "generatorLocale.modEnvDecay",
    [generatorTypes.sustainModEnv]: "generatorLocale.modEnvSustain",
    [generatorTypes.releaseModEnv]: "generatorLocale.modEnvRelease",
    [generatorTypes.modEnvToFilterFc]: "generatorLocale.modEnvToFilter",
    [generatorTypes.modEnvToPitch]: "generatorLocale.modEnvToPitch",

    [generatorTypes.keyNumToModEnvHold]: "generatorLocale.keyToModEnvHold",
    [generatorTypes.keyNumToModEnvDecay]: "generatorLocale.keyToModEnvDecay",

    [generatorTypes.delayModLFO]: "generatorLocale.modLfoDelay",
    [generatorTypes.freqModLFO]: "generatorLocale.modLfoFrequency",
    [generatorTypes.modLfoToPitch]: "generatorLocale.modLfoToPitch",
    [generatorTypes.modLfoToFilterFc]: "generatorLocale.modLfoToFilter",
    [generatorTypes.modLfoToVolume]: "generatorLocale.modLfoToVolume",

    [generatorTypes.delayVibLFO]: "generatorLocale.vibLfoDelay",
    [generatorTypes.freqVibLFO]: "generatorLocale.vibLfoFrequency",
    [generatorTypes.vibLfoToPitch]: "generatorLocale.vibLfoToPitch",

    [generatorTypes.chorusEffectsSend]: "generatorLocale.chorusLevel",
    [generatorTypes.reverbEffectsSend]: "generatorLocale.reverbLevel",

    [generatorTypes.startAddrsOffset]: "generatorLocale.sampleStartOffset",
    [generatorTypes.endAddrOffset]: "generatorLocale.sampleEndOffset",

    [generatorTypes.startloopAddrsOffset]: "generatorLocale.loopStartOffset",
    [generatorTypes.endloopAddrsOffset]: "generatorLocale.loopEndOffset"
};
