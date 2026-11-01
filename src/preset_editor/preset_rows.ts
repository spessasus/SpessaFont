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
        generator: GeneratorTypes.pan,
        unit: "pan"
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
        unit: "cent"
    },
    {
        generator: GeneratorTypes.initialFilterFc,
        unit: "acent"
    },
    {
        generator: GeneratorTypes.initialFilterQ,
        fromGenerator: cb2db,
        toGenerator: db2cb,
        precision: 1,
        unit: "dB"
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
        generator: GeneratorTypes.releaseVolEnv,
        highlight: true,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.keyNumToVolEnvHold,
        highlight: true,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.keyNumToVolEnvDecay,
        highlight: true,
        unit: "cent"
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
        unit: "cent"
    },
    {
        generator: GeneratorTypes.keyNumToModEnvDecay,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.delayModLFO,
        highlight: true,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.freqModLFO,
        highlight: true,
        unit: "acent"
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
        generator: GeneratorTypes.delayVibLFO,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.freqVibLFO,
        unit: "acent"
    },
    {
        generator: GeneratorTypes.vibLfoToPitch,
        unit: "cent"
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
    }
];
