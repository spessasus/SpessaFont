import { generatorTypes } from "spessasynth_core";
import type { TFunction } from "i18next";
import { generatorLocaleMap } from "./generator_to_locale_map.ts";

const destinationGeneratorOrder = [
    generatorTypes.initialAttenuation,
    generatorTypes.pan,
    generatorTypes.coarseTune,
    generatorTypes.fineTune,
    generatorTypes.initialFilterFc,
    generatorTypes.initialFilterQ,
    generatorTypes.delayVolEnv,
    generatorTypes.attackVolEnv,
    generatorTypes.holdVolEnv,
    generatorTypes.decayVolEnv,
    generatorTypes.sustainVolEnv,
    generatorTypes.releaseVolEnv,
    generatorTypes.keyNumToVolEnvHold,
    generatorTypes.keyNumToVolEnvDecay,
    generatorTypes.delayModEnv,
    generatorTypes.attackModEnv,
    generatorTypes.holdModEnv,
    generatorTypes.decayModEnv,
    generatorTypes.sustainModEnv,
    generatorTypes.releaseModEnv,
    generatorTypes.modEnvToFilterFc,
    generatorTypes.modEnvToPitch,
    generatorTypes.keyNumToModEnvHold,
    generatorTypes.keyNumToModEnvDecay,
    generatorTypes.delayModLFO,
    generatorTypes.freqModLFO,
    generatorTypes.modLfoToPitch,
    generatorTypes.modLfoToFilterFc,
    generatorTypes.modLfoToVolume,
    generatorTypes.delayVibLFO,
    generatorTypes.freqVibLFO,
    generatorTypes.vibLfoToPitch,
    generatorTypes.chorusEffectsSend,
    generatorTypes.reverbEffectsSend,
    generatorTypes.startAddrsOffset,
    generatorTypes.endAddrOffset,
    generatorTypes.startloopAddrsOffset,
    generatorTypes.endloopAddrsOffset
];

export function DestinationsOptions({ t }: { t: TFunction }) {
    return destinationGeneratorOrder.map((g) => (
        <option value={g} key={g}>
            {t(generatorLocaleMap[g])}
        </option>
    ));
}
