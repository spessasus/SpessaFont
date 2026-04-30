import { useTranslation } from "react-i18next";
import { useState } from "react";
import { loadSettings } from "./save_load/load.ts";
import "./settings.css";
import {
    type SavedSettingsType,
    type ThemeType
} from "./save_load/settings_typedef.ts";
import { saveSettings } from "./save_load/save.ts";
import { AudioEngineSettings } from "./settings_groups/audio_engine_settings.tsx";
import { InterfaceSettings } from "./settings_groups/interface_settings.tsx";
import { MidiSettings } from "./settings_groups/midi_settings.tsx";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";

export function Settings({ setTheme }: { setTheme: (t: ThemeType) => void }) {
    const { t } = useTranslation();
    const [settings, setSettings] = useState(loadSettings());

    const { audioEngine } = useAudioEngine();

    const updateSettings = (s: SavedSettingsType) => {
        audioEngine.applySettings(s);
        saveSettings(s);
        setSettings(s);
    };

    return (
        <div className={"settings"}>
            <h1>{t("settingsLocale.settings")}</h1>
            <div className={"settings_display"}>
                <AudioEngineSettings
                    settings={settings}
                    updateSettings={updateSettings}
                ></AudioEngineSettings>

                <InterfaceSettings
                    settings={settings}
                    updateSettings={updateSettings}
                    setTheme={setTheme}
                ></InterfaceSettings>

                <MidiSettings></MidiSettings>
            </div>
        </div>
    );
}
