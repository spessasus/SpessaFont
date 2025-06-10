import { useTranslation } from "react-i18next";
import { Setting } from "../setting.tsx";
import {
    getSetting,
    type SavedSettingsType
} from "../save_load/settings_typedef.ts";
import { interpolationTypes } from "spessasynth_core";

export type GroupSettingsProps = {
    settings: SavedSettingsType;
    updateSettings: (s: SavedSettingsType) => void;
};

export function AudioEngineSettings({
    updateSettings,
    settings
}: GroupSettingsProps) {
    function setInterpolation(t: interpolationTypes) {
        updateSettings({
            ...settings,
            interpolation: t
        });
    }

    function setVolume(v: string) {
        const vReal = parseInt(v.replace("%", "")) ?? 100;
        updateSettings({
            ...settings,
            volume: Math.max(0, Math.min(3, vReal / 100))
        });
    }

    function setReverb(v: string) {
        const vReal = parseInt(v.replace("%", "")) ?? 100;
        updateSettings({
            ...settings,
            reverbLevel: Math.max(0, Math.min(3, vReal / 100))
        });
    }

    function setChorus(v: string) {
        const vReal = parseInt(v.replace("%", "")) ?? 100;
        updateSettings({
            ...settings,
            chorusLevel: Math.max(0, Math.min(3, vReal / 100))
        });
    }

    const { t } = useTranslation();
    const engineT = "settingsLocale.audioEngine.";
    return (
        <div className={"settings_group"}>
            <h2>{t(`${engineT}title`)}</h2>
            <Setting locale={`${engineT}volume`}>
                <input
                    type={"text"}
                    maxLength={4}
                    className={"pretty_input monospaced"}
                    onChange={(e) => setVolume(e.target.value)}
                    value={`${Math.floor(getSetting("volume", settings) * 100)}%`}
                />
            </Setting>

            <Setting locale={`${engineT}interpolation.title`}>
                <select
                    onChange={(e) =>
                        setInterpolation(
                            parseInt(e.target.value) as interpolationTypes
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
                    <option value={interpolationTypes.fourthOrder}>
                        {t(`${engineT}interpolation.cubic`)}
                    </option>
                </select>
            </Setting>

            <Setting locale={`${engineT}reverbLevel`}>
                <input
                    type={"text"}
                    maxLength={4}
                    className={"pretty_input monospaced"}
                    onChange={(e) => setReverb(e.target.value)}
                    value={`${Math.floor(getSetting("reverbLevel", settings) * 100)}%`}
                />
            </Setting>

            <Setting locale={`${engineT}chorusLevel`}>
                <input
                    type={"text"}
                    maxLength={4}
                    className={"pretty_input monospaced"}
                    onChange={(e) => setChorus(e.target.value)}
                    value={`${Math.floor(getSetting("chorusLevel", settings) * 100)}%`}
                />
            </Setting>
        </div>
    );
}
