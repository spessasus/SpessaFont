import { GeneratorTypes } from "spessasynth_core";
import type { TFunction } from "i18next";
import { generatorLocaleMap } from "./generator_to_locale_map.ts";

const destinationGeneratorOrder = [
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

export function DestinationsOptions({ t }: { t: TFunction }) {
    return destinationGeneratorOrder.map((g) => (
        <option value={g} key={g}>
            {t(generatorLocaleMap[g])}
        </option>
    ));
}
