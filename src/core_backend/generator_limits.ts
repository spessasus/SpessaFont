// shamelessly stolen from spessasynth_core

import { GeneratorTypes } from "spessasynth_core";

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
export const GeneratorLimits: Readonly<Record<number, GeneratorLimit>> = Object.freeze({
// Offsets
[GeneratorTypes.startAddrsOffset]:            { min:       0, max: 32_768, def:       0 },
[GeneratorTypes.endAddrOffset]:               { min: -32_768, max: 32_768, def:       0 },
[GeneratorTypes.startAddrsCoarseOffset]:      { min:       0, max: 32_768, def:       0 },
[GeneratorTypes.endAddrsCoarseOffset]:        { min: -32_768, max: 32_768, def:       0 },
// Loop offsets
[GeneratorTypes.startloopAddrsOffset]:        { min: -32_768, max: 32_768, def:       0 },
[GeneratorTypes.endloopAddrsOffset]:          { min: -32_768, max: 32_768, def:       0 },
[GeneratorTypes.startloopAddrsCoarseOffset]:  { min: -32_768, max: 32_768, def:       0 },
[GeneratorTypes.endloopAddrsCoarseOffset]:    { min: -32_768, max: 32_768, def:       0 },



// Excursion
[GeneratorTypes.modLfoToPitch]:               { min: -12_000, max: 12_000, def:       0, pMin: -24_000, pMax: 24_000 },
[GeneratorTypes.vibLfoToPitch]:               { min: -12_000, max: 12_000, def:       0, pMin: -24_000, pMax: 24_000 },
[GeneratorTypes.modEnvToPitch]:               { min: -12_000, max: 12_000, def:       0, pMin: -24_000, pMax: 24_000 },
[GeneratorTypes.modLfoToFilterFc]:            { min: -12_000, max: 12_000, def:       0, pMin: -24_000, pMax: 24_000 },
[GeneratorTypes.modEnvToFilterFc]:            { min: -12_000, max: 12_000, def:       0, pMin: -24_000, pMax: 24_000 },
[GeneratorTypes.modLfoToVolume]:              { min:    -960, max:    960, def:       0, pMin: -1920,   pMax: 1920   },

// Lowpass
[GeneratorTypes.initialFilterFc]:             { min:   1500,  max: 13_500, def:  13_500, pMin: -21_000, pMax: 21_000 },
[GeneratorTypes.initialFilterQ]:              { min:       0, max:    960, def:       0, pMin: -960                  },

// Effects / pan
[GeneratorTypes.chorusEffectsSend]:           { min:       0, max:   1000, def:       0, pMin: -1000                 },
[GeneratorTypes.reverbEffectsSend]:           { min:       0, max:   1000, def:       0, pMin: -1000                 },
[GeneratorTypes.pan]:                         { min:    -500, max:    500, def:       0, pMin: -1000,   pMax: 1000   },

// LFO
[GeneratorTypes.delayModLFO]:                 { min: -12_000, max:   5000, def: -12_000, pMin: -21_000, pMax: 21_000 },
[GeneratorTypes.freqModLFO]:                  { min: -16_000, max:   4500, def:       0, pMin: -21_000, pMax: 21_000 },
[GeneratorTypes.delayVibLFO]:                 { min: -12_000, max:   5000, def: -12_000, pMin: -21_000, pMax: 21_000 },
[GeneratorTypes.freqVibLFO]:                  { min: -16_000, max:   4500, def:       0, pMin: -21_000, pMax: 21_000 },

// Mod envelope
[GeneratorTypes.delayModEnv]:                 { min: -12_000, max:   5000, def: -12_000, pMin: -21_000, pMax: 21_000 },
[GeneratorTypes.attackModEnv]:                { min: -12_000, max:   8000, def: -12_000, pMin: -21_000, pMax: 21_000 },
[GeneratorTypes.holdModEnv]:                  { min: -12_000, max:   5000, def: -12_000, pMin: -21_000, pMax: 21_000 },
[GeneratorTypes.decayModEnv]:                 { min: -12_000, max:   8000, def: -12_000, pMin: -21_000, pMax: 21_000 },
[GeneratorTypes.sustainModEnv]:               { min:       0, max:   1000, def:       0, pMin: -1000                 },
[GeneratorTypes.releaseModEnv]:               { min: -12_000, max:   8000, def: -12_000, pMin: -21_000, pMax: 21_000 },
[GeneratorTypes.keyNumToModEnvHold]:          { min:   -1200, max:   1200, def:       0, pMin: -2400,   pMax: 2400   },
[GeneratorTypes.keyNumToModEnvDecay]:         { min:   -1200, max:   1200, def:       0, pMin: -2400,   pMax: 2400   },

// Volume envelope
[GeneratorTypes.delayVolEnv]:                 { min: -12_000, max:   5000, def: -12_000, pMin: -21_000, pMax: 21_000 },
[GeneratorTypes.attackVolEnv]:                { min: -12_000, max:   8000, def: -12_000, pMin: -21_000, pMax: 21_000 },
[GeneratorTypes.holdVolEnv]:                  { min: -12_000, max:   5000, def: -12_000, pMin: -21_000, pMax: 21_000 },
[GeneratorTypes.decayVolEnv]:                 { min: -12_000, max:   8000, def: -12_000, pMin: -21_000, pMax: 21_000 },
[GeneratorTypes.sustainVolEnv]:               { min:       0, max:   1440, def:       0, pMin: -1440                 },
[GeneratorTypes.releaseVolEnv]:               { min: -12_000, max:   8000, def: -12_000, pMin: -21_000, pMax: 21_000 },
[GeneratorTypes.keyNumToVolEnvHold]:          { min:   -1200, max:   1200, def:       0, pMin: -2400,   pMax: 2400   },
[GeneratorTypes.keyNumToVolEnvDecay]:         { min:   -1200, max:   1200, def:       0, pMin: -2400,   pMax: 2400   },

// Tuning
[GeneratorTypes.coarseTune]:                  { min:    -120, max:    120, def:       0, pMin: -240, pMax: 240       },
[GeneratorTypes.fineTune]:                    { min: -12_700, max: 12_700, def:       0, pMin: -198, pMax: 198       },
[GeneratorTypes.scaleTuning]:                 { min:       0, max:   1200, def:     100, pMin: -1200                 },

// Misc
[GeneratorTypes.keyNum]:                      { min:      -1, max:    127, def:      -1                              },
[GeneratorTypes.velocity]:                    { min:      -1, max:    127, def:      -1                              },
[GeneratorTypes.initialAttenuation]:          { min:       0, max:   1440, def:       0, pMin: -1440                 },
[GeneratorTypes.exclusiveClass]:              { min:       0, max: 99_999, def:       0                              },
[GeneratorTypes.overridingRootKey]:           { min:      -1, max:    127, def:      -1                              },
[GeneratorTypes.sampleModes]:                 { min:       0, max:      3, def:       0                              }
});
