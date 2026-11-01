import { GeneratorTypes, MIDIControllers } from "spessasynth_core";
import type { TFunction } from "i18next";
import { generatorLocaleMap } from "./generator_to_locale_map.ts";
import { MODULABLE_CCS } from "../midi_constants.ts";

export interface SelectOption {
    value: number;
    label: string;
}

/**
 * Modulator destinations in the order the picker lists them.
 */
const DESTINATION_ORDER = [
    GeneratorTypes.initialAttenuation,
    GeneratorTypes.pan,
    GeneratorTypes.coarseTune,
    GeneratorTypes.fineTune,
    GeneratorTypes.initialFilterFc,
    GeneratorTypes.initialFilterQ,
    GeneratorTypes.delayVolEnv,
    GeneratorTypes.attackVolEnv,
    GeneratorTypes.holdVolEnv,
    GeneratorTypes.decayVolEnv,
    GeneratorTypes.sustainVolEnv,
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
    GeneratorTypes.delayModLFO,
    GeneratorTypes.freqModLFO,
    GeneratorTypes.modLfoToPitch,
    GeneratorTypes.modLfoToFilterFc,
    GeneratorTypes.modLfoToVolume,
    GeneratorTypes.delayVibLFO,
    GeneratorTypes.freqVibLFO,
    GeneratorTypes.vibLfoToPitch,
    GeneratorTypes.chorusEffectsSend,
    GeneratorTypes.reverbEffectsSend,
    GeneratorTypes.startAddrsOffset,
    GeneratorTypes.endAddrOffset,
    GeneratorTypes.startloopAddrsOffset,
    GeneratorTypes.endloopAddrsOffset
];

/**
 * Pads the CC number so the names line up in a monospaced select.
 */
const CC_NUMBER_WIDTH = 5;

function getControllerName(cc: number, t: TFunction) {
    let name: string =
        (Object.keys(MIDIControllers) as (keyof typeof MIDIControllers)[]).find(
            (key) => MIDIControllers[key] === cc
        ) ?? "notDefined";
    if (name.startsWith("undefined")) {
        name = "notDefined";
    }
    return t(`MIDIControllersLocale.${name}`);
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
