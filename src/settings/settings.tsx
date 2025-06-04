import type { AudioEngine } from "../core_backend/audio_engine.ts";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { loadSettings } from "./save_load/load.ts";
import "./settings.css";
import { LocaleList } from "../locale/locale_list.ts";
import {
    applyAudioSettings,
    getSetting,
    type SavedSettingsType,
    type ThemeType,
    UNSET_LANGUAGE
} from "./save_load/settings_typedef.ts";
import { getUserLocale } from "./save_load/get_user_locale.ts";
import { logInfo } from "../utils/core_utils.ts";
import { saveSettings } from "./save_load/save.ts";
import { Setting } from "./setting.tsx";
import { interpolationTypes } from "spessasynth_core";

export function Settings({
    engine,
    setTheme
}: {
    engine: AudioEngine;
    setTheme: (t: ThemeType) => void;
}) {
    const { t, i18n } = useTranslation();
    const [settings, setSettings] = useState(loadSettings());

    const updateSettings = (s: SavedSettingsType) => {
        applyAudioSettings(s, engine.processor);
        saveSettings(s);
        setSettings(s);
    };

    let language = getSetting("lang", settings);
    if (language === UNSET_LANGUAGE) {
        language = getUserLocale();
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

    function setLanguage(code: string) {
        logInfo(`Changing language to: ${code}`);
        i18n.changeLanguage(code).then(() => {
            updateSettings({
                ...settings,
                lang: code
            });
        });
    }

    function setAppTheme(t: ThemeType) {
        updateSettings({
            ...settings,
            theme: t
        });
        setTheme(t);
    }

    function setInterpolation(t: interpolationTypes) {
        updateSettings({
            ...settings,
            interpolation: t
        });
    }

    const engineT = "settingsLocale.audioEngine.";
    return (
        <div className={"settings"}>
            <h1>{t("settingsLocale.settings")}</h1>
            <div className={"settings_display"}>
                <div className={"settings_group"}>
                    <h2>{t(`${engineT}title`)}</h2>
                    <Setting locale={`${engineT}volume`}>
                        <input
                            type={"text"}
                            maxLength={4}
                            className={"pretty_input"}
                            onChange={(e) => setVolume(e.target.value)}
                            value={`${Math.floor(getSetting("volume", settings) * 100)}%`}
                        />
                    </Setting>

                    <Setting locale={`${engineT}interpolation.title`}>
                        <select
                            onChange={(e) =>
                                setInterpolation(
                                    parseInt(
                                        e.target.value
                                    ) as interpolationTypes
                                )
                            }
                            className={"pretty_input"}
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
                            className={"pretty_input"}
                            onChange={(e) => setReverb(e.target.value)}
                            value={`${Math.floor(getSetting("reverbLevel", settings) * 100)}%`}
                        />
                    </Setting>

                    <Setting locale={`${engineT}chorusLevel`}>
                        <input
                            type={"text"}
                            maxLength={4}
                            className={"pretty_input"}
                            onChange={(e) => setChorus(e.target.value)}
                            value={`${Math.floor(getSetting("chorusLevel", settings) * 100)}%`}
                        />
                    </Setting>
                </div>

                <div className={"settings_group"}>
                    <h2>{t("settingsLocale.interface.title")}</h2>
                    <Setting locale={"settingsLocale.interface.language"}>
                        <select
                            onChange={(e) => setLanguage(e.target.value)}
                            className={"pretty_input"}
                            value={language}
                        >
                            {Object.keys(LocaleList).map((code, i) => (
                                <option key={i} value={code}>
                                    {LocaleList[code].name}
                                </option>
                            ))}
                        </select>
                    </Setting>

                    <Setting locale={"settingsLocale.interface.theme"}>
                        <select
                            onChange={(e) =>
                                setAppTheme(e.target.value as ThemeType)
                            }
                            className={"pretty_input"}
                            value={getSetting("theme", settings)}
                        >
                            <option value={"dark"}>
                                {t("settingsLocale.interface.dark")}
                            </option>
                            <option value={"light"}>
                                {t("settingsLocale.interface.light")}
                            </option>
                        </select>
                    </Setting>
                </div>
            </div>
        </div>
    );
}
