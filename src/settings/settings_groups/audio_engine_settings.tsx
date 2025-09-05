import { useTranslation } from "react-i18next";
import { Setting } from "../setting.tsx";
import {
    getSetting,
    type SavedSettingsType
} from "../save_load/settings_typedef.ts";
import { type InterpolationType, interpolationTypes } from "spessasynth_core";
import { WaitingInput } from "../../fancy_inputs/waiting_input/waiting_input.tsx";

export interface GroupSettingsProps {
    settings: SavedSettingsType;
    updateSettings: (s: SavedSettingsType) => void;
}

const MAX_GAIN = 10;
const MAX_REVERB = 10;
const MAX_CHORUS = 10;

export function AudioEngineSettings({
    updateSettings,
    settings
}: GroupSettingsProps) {
    function setInterpolation(t: InterpolationType) {
        updateSettings({
            ...settings,
            interpolation: t
        });
    }

    function setVolume(v: number) {
        const vol = Math.max(0, Math.min(MAX_GAIN, v / 100));
        updateSettings({
            ...settings,
            volume: vol
        });
        return vol * 100;
    }

    function setReverb(v: number) {
        const vReal = Math.max(0, Math.min(MAX_REVERB, v / 100));
        updateSettings({
            ...settings,
            reverbLevel: vReal
        });
        return vReal * 100;
    }

    function setChorus(v: number) {
        const vReal = Math.max(0, Math.min(MAX_CHORUS, v / 100));
        updateSettings({
            ...settings,
            chorusLevel: vReal
        });
        return vReal * 100;
    }

    const { t } = useTranslation();
    const engineT = "settingsLocale.audioEngine.";
    return (
        <div className={"settings_group hover_brightness"}>
            <h2>{t(`${engineT}title`)}</h2>
            <Setting locale={`${engineT}volume`}>
                <WaitingInput
                    setValue={setVolume}
                    type={"text"}
                    maxLength={5}
                    className={"pretty_input monospaced"}
                    suffix={"%"}
                    value={Math.floor(getSetting("volume", settings) * 100)}
                />
            </Setting>

            <Setting locale={`${engineT}interpolation.title`}>
                <select
                    onChange={(e) =>
                        setInterpolation(
                            parseInt(e.target.value) as InterpolationType
                        )
                    }
                    className={"pretty_input monospaced"}
                    value={getSetting("interpolation", settings)}
                >
                    <option value={interpolationTypes.nearestNeighbor}>
                        {t(`${engineT}interpolation.nearestNeighbor`)}
                    </option>
                    <option value={interpolationTypes.linear}>
                        {t(`${engineT}interpolation.linear`)}
                    </option>
                    <option value={interpolationTypes.hermite}>
                        {t(`${engineT}interpolation.cubic`)}
                    </option>
                </select>
            </Setting>

            <Setting locale={`${engineT}reverbLevel`}>
                <WaitingInput
                    setValue={setReverb}
                    type={"text"}
                    maxLength={5}
                    className={"pretty_input monospaced"}
                    value={Math.floor(
                        getSetting("reverbLevel", settings) * 100
                    )}
                    suffix={`%`}
                />
            </Setting>

            <Setting locale={`${engineT}chorusLevel`}>
                <WaitingInput
                    setValue={setChorus}
                    value={Math.floor(
                        getSetting("chorusLevel", settings) * 100
                    )}
                    type={"text"}
                    maxLength={5}
                    className={"pretty_input monospaced"}
                    suffix={`%`}
                />
            </Setting>
        </div>
    );
}
