import { GeneratorTypes } from "spessasynth_core";
import { cb2db, db2cb } from "../utils/conversion_helpers.ts";
import type { GeneratorRowType } from "../generator_table/generator_row_type.ts";

/**
 * The generator table rows of the preset editor.
 */
export const PRESET_ROWS: GeneratorRowType[] = [
    {
        generator: GeneratorTypes.keyRange
    },
    {
        generator: GeneratorTypes.velRange
    },
    {
        generator: GeneratorTypes.initialAttenuation,
        fromGenerator: (v) => v * 0.04,
        toGenerator: (v) => v / 0.04,
        unit: "dB",
        precision: 2
    },
    {
        generator: GeneratorTypes.amplitude,
        fromGenerator: (v) => v / 10,
        toGenerator: (v) => v * 10,
        precision: 1,
        unit: "percent"
    },
    {
        generator: GeneratorTypes.pan,
        unit: "presetPan"
    },
    {
        generator: GeneratorTypes.coarseTune,
        highlight: true
    },
    {
        generator: GeneratorTypes.fineTune,
        highlight: true
    },
    {
        generator: GeneratorTypes.scaleTuning,
        highlight: true,
        unit: "centPerKey"
    },
    {
        generator: GeneratorTypes.initialFilterFc,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.initialFilterQ,
        fromGenerator: cb2db,
        toGenerator: db2cb,
        precision: 1,
        unit: "dB"
    },
    {
        generator: GeneratorTypes.maxFilterFc,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.delayVolEnv,
        highlight: true,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.attackVolEnv,
        highlight: true,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.holdVolEnv,
        highlight: true,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.decayVolEnv,
        highlight: true,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.sustainVolEnv,
        highlight: true,
        fromGenerator: cb2db,
        toGenerator: db2cb,
        precision: 1,
        unit: "dB"
    },
    {
        generator: GeneratorTypes.decay2VolEnv,
        highlight: true,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.sustain2VolEnv,
        highlight: true,
        fromGenerator: cb2db,
        toGenerator: db2cb,
        precision: 1,
        unit: "dB"
    },
    {
        generator: GeneratorTypes.releaseVolEnv,
        highlight: true,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.keyNumToVolEnvHold,
        highlight: true,
        unit: "tcentPerKey"
    },
    {
        generator: GeneratorTypes.keyNumToVolEnvDecay,
        highlight: true,
        unit: "tcentPerKey"
    },
    {
        generator: GeneratorTypes.delayModEnv,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.attackModEnv,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.holdModEnv,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.decayModEnv,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.sustainModEnv,
        fromGenerator: (v) => v / 10,
        toGenerator: (v) => v * 10,
        precision: 1,
        unit: "percent"
    },
    {
        generator: GeneratorTypes.releaseModEnv,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.modEnvToFilterFc,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.modEnvToPitch,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.keyNumToModEnvHold,
        unit: "tcentPerKey"
    },
    {
        generator: GeneratorTypes.keyNumToModEnvDecay,
        unit: "tcentPerKey"
    },
    {
        generator: GeneratorTypes.delayModEnv2,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.attackModEnv2,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.holdModEnv2,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.decayModEnv2,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.sustainModEnv2,
        fromGenerator: (v) => v / 10,
        toGenerator: (v) => v * 10,
        precision: 1,
        unit: "percent"
    },
    {
        generator: GeneratorTypes.releaseModEnv2,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.modEnv2ToFilterFc,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.modEnv2ToPitch,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.keyNumToModEnv2Hold,
        unit: "tcentPerKey"
    },
    {
        generator: GeneratorTypes.keyNumToModEnv2Decay,
        unit: "tcentPerKey"
    },
    {
        generator: GeneratorTypes.delayModLFO,
        highlight: true,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.fadeModLFO,
        highlight: true,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.freqModLFO,
        highlight: true,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.modLfoRate,
        highlight: true,
        fromGenerator: (v) => v / 100,
        toGenerator: (v) => v * 100,
        precision: 2,
        unit: "Hz"
    },
    {
        generator: GeneratorTypes.modLfoStartPhase,
        highlight: true,
        unit: "degree"
    },
    {
        generator: GeneratorTypes.modLfoToPitch,
        highlight: true,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.modLfoToFilterFc,
        highlight: true,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.modLfoToVolume,
        highlight: true,
        fromGenerator: cb2db,
        toGenerator: db2cb,
        precision: 1,
        unit: "dB"
    },
    {
        generator: GeneratorTypes.modLfoAmplitudeDepth,
        highlight: true,
        fromGenerator: (v) => v / 10,
        toGenerator: (v) => v * 10,
        precision: 1,
        unit: "percent"
    },
    {
        generator: GeneratorTypes.delayVibLFO,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.fadeVibLFO,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.freqVibLFO,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.vibLfoRate,
        fromGenerator: (v) => v / 100,
        toGenerator: (v) => v * 100,
        precision: 2,
        unit: "Hz"
    },
    {
        generator: GeneratorTypes.vibLfoStartPhase,
        unit: "degree"
    },
    {
        generator: GeneratorTypes.vibLfoToPitch,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.vibLfoToFilterFc,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.vibLfoToVolume,
        fromGenerator: cb2db,
        toGenerator: db2cb,
        precision: 1,
        unit: "dB"
    },
    {
        generator: GeneratorTypes.vibLfoAmplitudeDepth,
        fromGenerator: (v) => v / 10,
        toGenerator: (v) => v * 10,
        precision: 1,
        unit: "percent"
    },
    {
        generator: GeneratorTypes.chorusEffectsSend,
        highlight: true,
        fromGenerator: (v) => v / 10,
        toGenerator: (v) => v * 10,
        precision: 1,
        unit: "percent"
    },
    {
        generator: GeneratorTypes.reverbEffectsSend,
        highlight: true,
        fromGenerator: (v) => v / 10,
        toGenerator: (v) => v * 10,
        precision: 1,
        unit: "percent"
    },
    {
        generator: GeneratorTypes.delayVoice,
        highlight: true,
        unit: "tcent"
    }
];
