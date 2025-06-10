import { generatorTypes } from "spessasynth_core";
import { useTranslation } from "react-i18next";

export function DestinationPicker({
    destination,
    setDestination
}: {
    destination: generatorTypes;
    setDestination: (d: generatorTypes) => void;
}) {
    const { t } = useTranslation();
    return (
        <select
            className={"pretty_outline destination_picker monospaced"}
            value={destination}
            onChange={(e) =>
                setDestination(
                    parseInt(e.target.value) ||
                        generatorTypes.initialAttenuation
                )
            }
        >
            <option value={generatorTypes.initialAttenuation}>
                {t("generatorLocale.attenuation")}
            </option>
            <option value={generatorTypes.pan}>
                {t("generatorLocale.pan")}
            </option>
            <option value={generatorTypes.coarseTune}>
                {t("generatorLocale.semitoneTuning")}
            </option>
            <option value={generatorTypes.fineTune}>
                {t("generatorLocale.centTuning")}
            </option>
            <option value={generatorTypes.initialFilterFc}>
                {t("generatorLocale.filterCutoff")}
            </option>
            <option value={generatorTypes.initialFilterQ}>
                {t("generatorLocale.filterResonance")}
            </option>
            <option value={generatorTypes.delayVolEnv}>
                {t("generatorLocale.volEnvDelay")}
            </option>
            <option value={generatorTypes.attackVolEnv}>
                {t("generatorLocale.volEnvAttack")}
            </option>
            <option value={generatorTypes.holdVolEnv}>
                {t("generatorLocale.volEnvHold")}
            </option>
            <option value={generatorTypes.decayVolEnv}>
                {t("generatorLocale.volEnvDecay")}
            </option>
            <option value={generatorTypes.sustainVolEnv}>
                {t("generatorLocale.volEnvSustain")}
            </option>
            <option value={generatorTypes.releaseVolEnv}>
                {t("generatorLocale.volEnvRelease")}
            </option>
            <option value={generatorTypes.keyNumToVolEnvHold}>
                {t("generatorLocale.keyToVolEnvHold")}
            </option>
            <option value={generatorTypes.keyNumToVolEnvDecay}>
                {t("generatorLocale.keyToVolEnvDecay")}
            </option>
            <option value={generatorTypes.delayModEnv}>
                {t("generatorLocale.modEnvDelay")}
            </option>
            <option value={generatorTypes.attackModEnv}>
                {t("generatorLocale.modEnvAttack")}
            </option>
            <option value={generatorTypes.holdModEnv}>
                {t("generatorLocale.modEnvHold")}
            </option>
            <option value={generatorTypes.decayModEnv}>
                {t("generatorLocale.modEnvDecay")}
            </option>
            <option value={generatorTypes.sustainModEnv}>
                {t("generatorLocale.modEnvSustain")}
            </option>
            <option value={generatorTypes.releaseModEnv}>
                {t("generatorLocale.modEnvRelease")}
            </option>
            <option value={generatorTypes.keyNumToModEnvHold}>
                {t("generatorLocale.keyToModEnvHold")}
            </option>
            <option value={generatorTypes.keyNumToModEnvDecay}>
                {t("generatorLocale.keyToModEnvDecay")}
            </option>
            <option value={generatorTypes.delayModLFO}>
                {t("generatorLocale.modLfoDelay")}
            </option>
            <option value={generatorTypes.freqModLFO}>
                {t("generatorLocale.modLfoFrequency")}
            </option>
            <option value={generatorTypes.modLfoToPitch}>
                {t("generatorLocale.modLfoToPitch")}
            </option>
            <option value={generatorTypes.modLfoToFilterFc}>
                {t("generatorLocale.modLfoToFilter")}
            </option>
            <option value={generatorTypes.modLfoToVolume}>
                {t("generatorLocale.modLfoToVolume")}
            </option>
            <option value={generatorTypes.delayVibLFO}>
                {t("generatorLocale.vibLfoDelay")}
            </option>
            <option value={generatorTypes.freqVibLFO}>
                {t("generatorLocale.vibLfoFrequency")}
            </option>
            <option value={generatorTypes.vibLfoToPitch}>
                {t("generatorLocale.vibLfoToPitch")}
            </option>
            <option value={generatorTypes.chorusEffectsSend}>
                {t("generatorLocale.chorusLevel")}
            </option>
            <option value={generatorTypes.reverbEffectsSend}>
                {t("generatorLocale.reverbLevel")}
            </option>
            <option value={generatorTypes.startAddrsOffset}>
                {t("generatorLocale.sampleStartOffset")}
            </option>
            <option value={generatorTypes.endAddrOffset}>
                {t("generatorLocale.sampleEndOffset")}
            </option>
            <option value={generatorTypes.startloopAddrsOffset}>
                {t("generatorLocale.loopStartOffset")}
            </option>
            <option value={generatorTypes.endloopAddrsOffset}>
                {t("generatorLocale.loopEndOffset")}
            </option>
        </select>
    );
}
