declare module "spessasynth_core" {
    export type interpolationTypes = number;
    export namespace interpolationTypes {
        let linear: number;
        let nearestNeighbor: number;
        let fourthOrder: number;
    }
    /**
     * The text types for the synth display
     */
    export type synthDisplayTypes = number;
    export namespace synthDisplayTypes {
        let SoundCanvasText: number;
        let XGText: number;
        let SoundCanvasDotDisplay: number;
    }

    export enum generatorTypes {
        INVALID = -1,
        startAddrsOffset = 0,
        endAddrOffset = 1,
        startloopAddrsOffset = 2,
        endloopAddrsOffset = 3,
        startAddrsCoarseOffset = 4,
        modLfoToPitch = 5,
        vibLfoToPitch = 6,
        modEnvToPitch = 7,
        initialFilterFc = 8,
        initialFilterQ = 9,
        modLfoToFilterFc = 10,
        modEnvToFilterFc = 11,
        endAddrsCoarseOffset = 12,
        modLfoToVolume = 13,
        unused1 = 14,
        chorusEffectsSend = 15,
        reverbEffectsSend = 16,
        pan = 17,
        unused2 = 18,
        unused3 = 19,
        unused4 = 20,
        delayModLFO = 21,
        freqModLFO = 22,
        delayVibLFO = 23,
        freqVibLFO = 24,
        delayModEnv = 25,
        attackModEnv = 26,
        holdModEnv = 27,
        decayModEnv = 28,
        sustainModEnv = 29,
        releaseModEnv = 30,
        keyNumToModEnvHold = 31,
        keyNumToModEnvDecay = 32,
        delayVolEnv = 33,
        attackVolEnv = 34,
        holdVolEnv = 35,
        decayVolEnv = 36,
        sustainVolEnv = 37,
        releaseVolEnv = 38,
        keyNumToVolEnvHold = 39,
        keyNumToVolEnvDecay = 40,
        instrument = 41,
        reserved1 = 42,
        keyRange = 43,
        velRange = 44,
        startloopAddrsCoarseOffset = 45,
        keyNum = 46,
        velocity = 47,
        initialAttenuation = 48,
        reserved2 = 49,
        endloopAddrsCoarseOffset = 50,
        coarseTune = 51,
        fineTune = 52,
        sampleID = 53,
        sampleModes = 54,
        reserved3 = 55,
        scaleTuning = 56,
        exclusiveClass = 57,
        overridingRootKey = 58,
        unused5 = 59,
        endOper = 60,
        vibLfoToVolume = 61,
        vibLfoToFilterFc = 62
    }

    export enum masterParameterType {
        mainVolume = 0,
        masterPan = 1,
        voicesCap = 2,
        interpolationType = 3,
        midiSystem = 4
    }
}
