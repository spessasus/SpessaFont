// shamelessly stolen from spessasynth_core

import { generatorTypes } from "spessasynth_core";

/**
 * min: minimum value, max: maximum value, def: default value, nrpn: nprn scale...
 */
const generatorLimits: {
    min: number;
    max: number;
    def: number;
    nrpn: number;
}[] = [];
// offsets
generatorLimits[generatorTypes.startAddrsOffset] = {
    min: 0,
    max: 32768,
    def: 0,
    nrpn: 1
};
generatorLimits[generatorTypes.endAddrOffset] = {
    min: -32768,
    max: 32768,
    def: 0,
    nrpn: 1
};
generatorLimits[generatorTypes.startloopAddrsOffset] = {
    min: -32768,
    max: 32768,
    def: 0,
    nrpn: 1
};
generatorLimits[generatorTypes.endloopAddrsOffset] = {
    min: -32768,
    max: 32768,
    def: 0,
    nrpn: 1
};
generatorLimits[generatorTypes.startAddrsCoarseOffset] = {
    min: 0,
    max: 32768,
    def: 0,
    nrpn: 1
};

// pitch influence
generatorLimits[generatorTypes.modLfoToPitch] = {
    min: -12000,
    max: 12000,
    def: 0,
    nrpn: 2
};
generatorLimits[generatorTypes.vibLfoToPitch] = {
    min: -12000,
    max: 12000,
    def: 0,
    nrpn: 2
};
generatorLimits[generatorTypes.modEnvToPitch] = {
    min: -12000,
    max: 12000,
    def: 0,
    nrpn: 2
};

// lowpass
generatorLimits[generatorTypes.initialFilterFc] = {
    min: 1500,
    max: 13500,
    def: 13500,
    nrpn: 2
};
generatorLimits[generatorTypes.initialFilterQ] = {
    min: 0,
    max: 960,
    def: 0,
    nrpn: 1
};
generatorLimits[generatorTypes.modLfoToFilterFc] = {
    min: -12000,
    max: 12000,
    def: 0,
    nrpn: 2
};
generatorLimits[generatorTypes.vibLfoToFilterFc] = {
    min: -12000,
    max: 12000,
    def: 0,
    nrpn: 2
}; // NON-STANDARD
generatorLimits[generatorTypes.modEnvToFilterFc] = {
    min: -12000,
    max: 12000,
    def: 0,
    nrpn: 2
};

generatorLimits[generatorTypes.endAddrsCoarseOffset] = {
    min: -32768,
    max: 32768,
    def: 0,
    nrpn: 1
};

generatorLimits[generatorTypes.modLfoToVolume] = {
    min: -960,
    max: 960,
    def: 0,
    nrpn: 1
};
generatorLimits[generatorTypes.vibLfoToVolume] = {
    min: -960,
    max: 960,
    def: 0,
    nrpn: 1
}; // NON-STANDARD

// effects, pan
generatorLimits[generatorTypes.chorusEffectsSend] = {
    min: 0,
    max: 1000,
    def: 0,
    nrpn: 1
};
generatorLimits[generatorTypes.reverbEffectsSend] = {
    min: 0,
    max: 1000,
    def: 0,
    nrpn: 1
};
generatorLimits[generatorTypes.pan] = { min: -500, max: 500, def: 0, nrpn: 1 };

// lfo
generatorLimits[generatorTypes.delayModLFO] = {
    min: -12000,
    max: 5000,
    def: -12000,
    nrpn: 2
};
generatorLimits[generatorTypes.freqModLFO] = {
    min: -16000,
    max: 4500,
    def: 0,
    nrpn: 4
};
generatorLimits[generatorTypes.delayVibLFO] = {
    min: -12000,
    max: 5000,
    def: -12000,
    nrpn: 2
};
generatorLimits[generatorTypes.freqVibLFO] = {
    min: -16000,
    max: 4500,
    def: 0,
    nrpn: 4
};

// mod env
generatorLimits[generatorTypes.delayModEnv] = {
    min: -32768,
    max: 5000,
    def: -32768,
    nrpn: 2
}; // -32,768 indicates instant phase,
// this is done to prevent click at the start of filter modenv
generatorLimits[generatorTypes.attackModEnv] = {
    min: -32768,
    max: 8000,
    def: -32768,
    nrpn: 2
};
generatorLimits[generatorTypes.holdModEnv] = {
    min: -12000,
    max: 5000,
    def: -12000,
    nrpn: 2
};
generatorLimits[generatorTypes.decayModEnv] = {
    min: -12000,
    max: 8000,
    def: -12000,
    nrpn: 2
};
generatorLimits[generatorTypes.sustainModEnv] = {
    min: 0,
    max: 1000,
    def: 0,
    nrpn: 1
};
generatorLimits[generatorTypes.releaseModEnv] = {
    min: -7200,
    max: 8000,
    def: -12000,
    nrpn: 2
}; // min is set to -7200 to prevent lowpass clicks
// key num to mod env
generatorLimits[generatorTypes.keyNumToModEnvHold] = {
    min: -1200,
    max: 1200,
    def: 0,
    nrpn: 1
};
generatorLimits[generatorTypes.keyNumToModEnvDecay] = {
    min: -1200,
    max: 1200,
    def: 0,
    nrpn: 1
};

// vol env
generatorLimits[generatorTypes.delayVolEnv] = {
    min: -12000,
    max: 5000,
    def: -12000,
    nrpn: 2
};
generatorLimits[generatorTypes.attackVolEnv] = {
    min: -12000,
    max: 8000,
    def: -12000,
    nrpn: 2
};
generatorLimits[generatorTypes.holdVolEnv] = {
    min: -12000,
    max: 5000,
    def: -12000,
    nrpn: 2
};
generatorLimits[generatorTypes.decayVolEnv] = {
    min: -12000,
    max: 8000,
    def: -12000,
    nrpn: 2
};
generatorLimits[generatorTypes.sustainVolEnv] = {
    min: 0,
    max: 1440,
    def: 0,
    nrpn: 1
};
generatorLimits[generatorTypes.releaseVolEnv] = {
    min: -7200,
    max: 8000,
    def: -12000,
    nrpn: 2
}; // min is set to -7200 prevent clicks
// key num to vol env
generatorLimits[generatorTypes.keyNumToVolEnvHold] = {
    min: -1200,
    max: 1200,
    def: 0,
    nrpn: 1
};
generatorLimits[generatorTypes.keyNumToVolEnvDecay] = {
    min: -1200,
    max: 1200,
    def: 0,
    nrpn: 1
};

generatorLimits[generatorTypes.startloopAddrsCoarseOffset] = {
    min: -32768,
    max: 32768,
    def: 0,
    nrpn: 1
};
generatorLimits[generatorTypes.keyNum] = {
    min: -1,
    max: 127,
    def: -1,
    nrpn: 1
};
generatorLimits[generatorTypes.velocity] = {
    min: -1,
    max: 127,
    def: -1,
    nrpn: 1
};

generatorLimits[generatorTypes.initialAttenuation] = {
    min: 0,
    max: 1440,
    def: 0,
    nrpn: 1
};

generatorLimits[generatorTypes.endloopAddrsCoarseOffset] = {
    min: -32768,
    max: 32768,
    def: 0,
    nrpn: 1
};

generatorLimits[generatorTypes.coarseTune] = {
    min: -120,
    max: 120,
    def: 0,
    nrpn: 1
};
generatorLimits[generatorTypes.fineTune] = {
    min: -12700,
    max: 12700,
    def: 0,
    nrpn: 1
}; // this generator is used as initial pitch, hence this range
generatorLimits[generatorTypes.scaleTuning] = {
    min: 0,
    max: 1200,
    def: 100,
    nrpn: 1
};
generatorLimits[generatorTypes.exclusiveClass] = {
    min: 0,
    max: 99999,
    def: 0,
    nrpn: 0
};
generatorLimits[generatorTypes.overridingRootKey] = {
    min: 0 - 1,
    max: 127,
    def: -1,
    nrpn: 0
};
generatorLimits[generatorTypes.sampleModes] = {
    min: 0,
    max: 3,
    def: 0,
    nrpn: 0
};

export { generatorLimits };
