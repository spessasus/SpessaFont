import { GeneratorTypes, MIDIControllers } from "spessasynth_core";
import type { TFunction } from "i18next";
import { generatorLocaleMap } from "./generator_to_locale_map.ts";
import { MODULABLE_CCS } from "../midi_constants.ts";
import { MIDIControllersLocale } from "../../locale/locale_en/midi_controllers.ts";

export interface SelectOption {
    value: number;
    label: string;
}

/**
 * Modulator destinations in the order the picker lists them.
 * The SpessaSynth generators (61 and up) sit next to their SF2 relatives. The switches among
 * them (ignore note off and the LFO waveforms) are left out, like the looping mode.
 */
const DESTINATION_ORDER = [
    GeneratorTypes.initialAttenuation,
    GeneratorTypes.amplitude,
    GeneratorTypes.pan,
    GeneratorTypes.coarseTune,
    GeneratorTypes.fineTune,
    GeneratorTypes.initialFilterFc,
    GeneratorTypes.initialFilterQ,
    GeneratorTypes.maxFilterFc,
    GeneratorTypes.delayVolEnv,
    GeneratorTypes.attackVolEnv,
    GeneratorTypes.holdVolEnv,
    GeneratorTypes.decayVolEnv,
    GeneratorTypes.sustainVolEnv,
    GeneratorTypes.decay2VolEnv,
    GeneratorTypes.sustain2VolEnv,
    GeneratorTypes.releaseVolEnv,
    GeneratorTypes.keyNumToVolEnvHold,
    GeneratorTypes.keyNumToVolEnvDecay,
    GeneratorTypes.delayModEnv,
    GeneratorTypes.attackModEnv,
    GeneratorTypes.holdModEnv,
    GeneratorTypes.decayModEnv,
    GeneratorTypes.sustainModEnv,
    GeneratorTypes.releaseModEnv,
    GeneratorTypes.modEnvToFilterFc,
    GeneratorTypes.modEnvToPitch,
    GeneratorTypes.keyNumToModEnvHold,
    GeneratorTypes.keyNumToModEnvDecay,
    GeneratorTypes.delayModEnv2,
    GeneratorTypes.attackModEnv2,
    GeneratorTypes.holdModEnv2,
    GeneratorTypes.decayModEnv2,
    GeneratorTypes.sustainModEnv2,
    GeneratorTypes.releaseModEnv2,
    GeneratorTypes.modEnv2ToFilterFc,
    GeneratorTypes.modEnv2ToPitch,
    GeneratorTypes.keyNumToModEnv2Hold,
    GeneratorTypes.keyNumToModEnv2Decay,
    GeneratorTypes.delayModLFO,
    GeneratorTypes.fadeModLFO,
    GeneratorTypes.freqModLFO,
    GeneratorTypes.modLfoRate,
    GeneratorTypes.modLfoStartPhase,
    GeneratorTypes.modLfoToPitch,
    GeneratorTypes.modLfoToFilterFc,
    GeneratorTypes.modLfoToVolume,
    GeneratorTypes.modLfoAmplitudeDepth,
    GeneratorTypes.delayVibLFO,
    GeneratorTypes.fadeVibLFO,
    GeneratorTypes.freqVibLFO,
    GeneratorTypes.vibLfoRate,
    GeneratorTypes.vibLfoStartPhase,
    GeneratorTypes.vibLfoToPitch,
    GeneratorTypes.vibLfoToFilterFc,
    GeneratorTypes.vibLfoToVolume,
    GeneratorTypes.vibLfoAmplitudeDepth,
    GeneratorTypes.chorusEffectsSend,
    GeneratorTypes.reverbEffectsSend,
    GeneratorTypes.delayVoice,
    GeneratorTypes.startAddrsOffset,
    GeneratorTypes.endAddrOffset,
    GeneratorTypes.startloopAddrsOffset,
    GeneratorTypes.endloopAddrsOffset
];

/**
 * Pads the CC number so the names line up in a monospaced select.
 */
const CC_NUMBER_WIDTH = 5;

function isControllerLocaleKey(
    name: string
): name is keyof typeof MIDIControllersLocale {
    return Object.hasOwn(MIDIControllersLocale, name);
}

function getControllerName(cc: number, t: TFunction) {
    const name = (
        Object.keys(MIDIControllers) as (keyof typeof MIDIControllers)[]
    ).find((key) => MIDIControllers[key] === cc);
    // The locale uses the controller names of spessasynth_core, and "notDefined" for the rest
    const key = name && isControllerLocaleKey(name) ? name : "notDefined";
    return t(`MIDIControllersLocale.${key}`);
}

/**
 * The MIDI controllers a modulator can use as a source.
 */
export function getControllerOptions(t: TFunction): SelectOption[] {
    return MODULABLE_CCS.map((cc) => ({
        value: cc,
        label: `CC#${cc.toString().padEnd(CC_NUMBER_WIDTH, "\u{A0}")} - ${getControllerName(cc, t)}`
    }));
}

/**
 * The generators a modulator can target.
 */
export function getDestinationOptions(t: TFunction): SelectOption[] {
    return DESTINATION_ORDER.map((generator) => ({
        value: generator,
        label: t(generatorLocaleMap[generator])
    }));
}
