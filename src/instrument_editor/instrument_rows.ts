import { GeneratorTypes } from "spessasynth_core";
import {
    ac2hz,
    cb2db,
    db2cb,
    hz2ac,
    s2tc,
    tc2s
} from "../utils/conversion_helpers.ts";
import type { GeneratorRowType } from "../generator_table/generator_row_type.ts";

/**
 * The generator table rows of the instrument editor.
 */
export const INSTRUMENT_ROWS: GeneratorRowType[] = [
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
        unit: "pan"
    },
    {
        generator: GeneratorTypes.sampleModes
    },
    {
        generator: GeneratorTypes.overridingRootKey
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
        fromGenerator: ac2hz,
        toGenerator: hz2ac,
        unit: "Hz"
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
        fromGenerator: ac2hz,
        toGenerator: hz2ac,
        unit: "Hz"
    },
    {
        generator: GeneratorTypes.delayVolEnv,
        highlight: true,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: GeneratorTypes.attackVolEnv,
        highlight: true,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: GeneratorTypes.holdVolEnv,
        highlight: true,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: GeneratorTypes.decayVolEnv,
        highlight: true,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
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
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
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
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
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
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: GeneratorTypes.attackModEnv,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: GeneratorTypes.holdModEnv,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: GeneratorTypes.decayModEnv,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
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
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
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
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: GeneratorTypes.attackModEnv2,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: GeneratorTypes.holdModEnv2,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: GeneratorTypes.decayModEnv2,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
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
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
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
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: GeneratorTypes.fadeModLFO,
        highlight: true,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: GeneratorTypes.freqModLFO,
        highlight: true,
        fromGenerator: ac2hz,
        toGenerator: hz2ac,
        precision: 3,
        unit: "Hz"
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
        generator: GeneratorTypes.modLfoWaveform,
        highlight: true
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
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: GeneratorTypes.fadeVibLFO,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: GeneratorTypes.freqVibLFO,
        fromGenerator: ac2hz,
        toGenerator: hz2ac,
        precision: 3,
        unit: "Hz"
    },
    {
        generator: GeneratorTypes.vibLfoRate,
        fromGenerator: (v) => v / 100,
        toGenerator: (v) => v * 100,
        precision: 2,
        unit: "Hz"
    },
    {
        generator: GeneratorTypes.vibLfoWaveform
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
        generator: GeneratorTypes.exclusiveClass,
        highlight: true
    },
    {
        generator: GeneratorTypes.ignoreNoteOff,
        highlight: true
    },
    {
        generator: GeneratorTypes.delayVoice,
        highlight: true,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
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
        generator: GeneratorTypes.keyNum
    },
    {
        generator: GeneratorTypes.velocity
    },
    {
        generator: GeneratorTypes.startAddrsOffset
    },
    {
        generator: GeneratorTypes.endAddrOffset
    },
    {
        generator: GeneratorTypes.startloopAddrsOffset
    },
    {
        generator: GeneratorTypes.endloopAddrsOffset
    }
];
