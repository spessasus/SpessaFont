import { GeneratorTypes } from "spessasynth_core";

export const generatorLocaleMap: Record<number, string> = {
    [GeneratorTypes.keyRange]: "generatorLocale.keyRange",
    [GeneratorTypes.velRange]: "generatorLocale.velocityRange",
    [GeneratorTypes.sampleModes]: "generatorLocale.loopingMode",
    [GeneratorTypes.overridingRootKey]: "generatorLocale.overridingRootKey",
    [GeneratorTypes.scaleTuning]: "generatorLocale.scaleTuning",
    [GeneratorTypes.exclusiveClass]: "generatorLocale.exclusiveClass",
    [GeneratorTypes.keyNum]: "generatorLocale.fixedKey",
    [GeneratorTypes.velocity]: "generatorLocale.fixedVelocity",

    [GeneratorTypes.initialAttenuation]: "generatorLocale.attenuation",
    [GeneratorTypes.pan]: "generatorLocale.pan",

    [GeneratorTypes.coarseTune]: "generatorLocale.semitoneTuning",
    [GeneratorTypes.fineTune]: "generatorLocale.centTuning",

    [GeneratorTypes.initialFilterFc]: "generatorLocale.filterCutoff",
    [GeneratorTypes.initialFilterQ]: "generatorLocale.filterResonance",

    [GeneratorTypes.delayVolEnv]: "generatorLocale.volEnvDelay",
    [GeneratorTypes.attackVolEnv]: "generatorLocale.volEnvAttack",
    [GeneratorTypes.holdVolEnv]: "generatorLocale.volEnvHold",
    [GeneratorTypes.decayVolEnv]: "generatorLocale.volEnvDecay",
    [GeneratorTypes.sustainVolEnv]: "generatorLocale.volEnvSustain",
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

    [GeneratorTypes.delayModLFO]: "generatorLocale.modLfoDelay",
    [GeneratorTypes.freqModLFO]: "generatorLocale.modLfoFrequency",
    [GeneratorTypes.modLfoToPitch]: "generatorLocale.modLfoToPitch",
    [GeneratorTypes.modLfoToFilterFc]: "generatorLocale.modLfoToFilter",
    [GeneratorTypes.modLfoToVolume]: "generatorLocale.modLfoToVolume",

    [GeneratorTypes.delayVibLFO]: "generatorLocale.vibLfoDelay",
    [GeneratorTypes.freqVibLFO]: "generatorLocale.vibLfoFrequency",
    [GeneratorTypes.vibLfoToPitch]: "generatorLocale.vibLfoToPitch",

    [GeneratorTypes.chorusEffectsSend]: "generatorLocale.chorusLevel",
    [GeneratorTypes.reverbEffectsSend]: "generatorLocale.reverbLevel",

    [GeneratorTypes.startAddrsOffset]: "generatorLocale.sampleStartOffset",
    [GeneratorTypes.endAddrOffset]: "generatorLocale.sampleEndOffset",

    [GeneratorTypes.startloopAddrsOffset]: "generatorLocale.loopStartOffset",
    [GeneratorTypes.endloopAddrsOffset]: "generatorLocale.loopEndOffset"
};
