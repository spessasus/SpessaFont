// shamelessly stolen from spessasynth_core

import { generatorTypes } from "spessasynth_core";

interface GeneratorLimit {
    min: number;
    max: number;
    def: number;
    pMax?: number;
    pMin?: number;
}

/**
 * min: minimum value, max: maximum value, def: default value
 */
// prettier-ignore
export const generatorLimits: Readonly<Record<number, GeneratorLimit>> = Object.freeze({
// Offsets
[generatorTypes.startAddrsOffset]:            { min:       0, max: 32_768, def:       0 },
[generatorTypes.endAddrOffset]:               { min: -32_768, max: 32_768, def:       0 },
[generatorTypes.startAddrsCoarseOffset]:      { min:       0, max: 32_768, def:       0 },
[generatorTypes.endAddrsCoarseOffset]:        { min: -32_768, max: 32_768, def:       0 },
// Loop offsets
[generatorTypes.startloopAddrsOffset]:        { min: -32_768, max: 32_768, def:       0 },
[generatorTypes.endloopAddrsOffset]:          { min: -32_768, max: 32_768, def:       0 },
[generatorTypes.startloopAddrsCoarseOffset]:  { min: -32_768, max: 32_768, def:       0 },
[generatorTypes.endloopAddrsCoarseOffset]:    { min: -32_768, max: 32_768, def:       0 },



// Excursion
[generatorTypes.modLfoToPitch]:               { min: -12_000, max: 12_000, def:       0, pMin: -24_000, pMax: 24_000 },
[generatorTypes.vibLfoToPitch]:               { min: -12_000, max: 12_000, def:       0, pMin: -24_000, pMax: 24_000 },
[generatorTypes.modEnvToPitch]:               { min: -12_000, max: 12_000, def:       0, pMin: -24_000, pMax: 24_000 },
[generatorTypes.modLfoToFilterFc]:            { min: -12_000, max: 12_000, def:       0, pMin: -24_000, pMax: 24_000 },
[generatorTypes.modEnvToFilterFc]:            { min: -12_000, max: 12_000, def:       0, pMin: -24_000, pMax: 24_000 },
[generatorTypes.modLfoToVolume]:              { min:    -960, max:    960, def:       0, pMin: -1920,   pMax: 1920   },

// Lowpass
[generatorTypes.initialFilterFc]:             { min:   1500,  max: 13_500, def:  13_500, pMin: -21_000, pMax: 21_000 },
[generatorTypes.initialFilterQ]:              { min:       0, max:    960, def:       0, pMin: -960                  },

// Effects / pan
[generatorTypes.chorusEffectsSend]:           { min:       0, max:   1000, def:       0, pMin: -1000                 },
[generatorTypes.reverbEffectsSend]:           { min:       0, max:   1000, def:       0, pMin: -1000                 },
[generatorTypes.pan]:                         { min:    -500, max:    500, def:       0, pMin: -1000,   pMax: 1000   },

// LFO
[generatorTypes.delayModLFO]:                 { min: -12_000, max:   5000, def: -12_000, pMin: -21_000, pMax: 21_000 },
[generatorTypes.freqModLFO]:                  { min: -16_000, max:   4500, def:       0, pMin: -21_000, pMax: 21_000 },
[generatorTypes.delayVibLFO]:                 { min: -12_000, max:   5000, def: -12_000, pMin: -21_000, pMax: 21_000 },
[generatorTypes.freqVibLFO]:                  { min: -16_000, max:   4500, def:       0, pMin: -21_000, pMax: 21_000 },

// Mod envelope
[generatorTypes.delayModEnv]:                 { min: -12_000, max:   5000, def: -12_000, pMin: -21_000, pMax: 21_000 },
[generatorTypes.attackModEnv]:                { min: -12_000, max:   8000, def: -12_000, pMin: -21_000, pMax: 21_000 },
[generatorTypes.holdModEnv]:                  { min: -12_000, max:   5000, def: -12_000, pMin: -21_000, pMax: 21_000 },
[generatorTypes.decayModEnv]:                 { min: -12_000, max:   8000, def: -12_000, pMin: -21_000, pMax: 21_000 },
[generatorTypes.sustainModEnv]:               { min:       0, max:   1000, def:       0, pMin: -1000                 },
[generatorTypes.releaseModEnv]:               { min: -12_000, max:   8000, def: -12_000, pMin: -21_000, pMax: 21_000 },
[generatorTypes.keyNumToModEnvHold]:          { min:   -1200, max:   1200, def:       0, pMin: -2400,   pMax: 2400   },
[generatorTypes.keyNumToModEnvDecay]:         { min:   -1200, max:   1200, def:       0, pMin: -2400,   pMax: 2400   },

// Volume envelope
[generatorTypes.delayVolEnv]:                 { min: -12_000, max:   5000, def: -12_000, pMin: -21_000, pMax: 21_000 },
[generatorTypes.attackVolEnv]:                { min: -12_000, max:   8000, def: -12_000, pMin: -21_000, pMax: 21_000 },
[generatorTypes.holdVolEnv]:                  { min: -12_000, max:   5000, def: -12_000, pMin: -21_000, pMax: 21_000 },
[generatorTypes.decayVolEnv]:                 { min: -12_000, max:   8000, def: -12_000, pMin: -21_000, pMax: 21_000 },
[generatorTypes.sustainVolEnv]:               { min:       0, max:   1440, def:       0, pMin: -1440                 },
[generatorTypes.releaseVolEnv]:               { min: -12_000, max:   8000, def: -12_000, pMin: -21_000, pMax: 21_000 },
[generatorTypes.keyNumToVolEnvHold]:          { min:   -1200, max:   1200, def:       0, pMin: -2400,   pMax: 2400   },
[generatorTypes.keyNumToVolEnvDecay]:         { min:   -1200, max:   1200, def:       0, pMin: -2400,   pMax: 2400   },

// Tuning
[generatorTypes.coarseTune]:                  { min:    -120, max:    120, def:       0, pMin: -240, pMax: 240       },
[generatorTypes.fineTune]:                    { min: -12_700, max: 12_700, def:       0, pMin: -198, pMax: 198       },
[generatorTypes.scaleTuning]:                 { min:       0, max:   1200, def:     100, pMin: -1200                 },

// Misc
[generatorTypes.keyNum]:                      { min:      -1, max:    127, def:      -1                              },
[generatorTypes.velocity]:                    { min:      -1, max:    127, def:      -1                              },
[generatorTypes.initialAttenuation]:          { min:       0, max:   1440, def:       0, pMin: -1440                 },
[generatorTypes.exclusiveClass]:              { min:       0, max: 99_999, def:       0                              },
[generatorTypes.overridingRootKey]:           { min:      -1, max:    127, def:      -1                              },
[generatorTypes.sampleModes]:                 { min:       0, max:      3, def:       0                              }
});
