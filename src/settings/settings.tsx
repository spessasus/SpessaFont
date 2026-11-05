import { useTranslation } from "react-i18next";
import "./settings.css";
import type { SavedSettingsType } from "./save_load/settings_typedef.ts";
import { AudioEngineSettings } from "./settings_groups/audio_engine_settings.tsx";
import { InterfaceSettings } from "./settings_groups/interface_settings.tsx";
import { MidiSettings } from "./settings_groups/midi_settings.tsx";
import { ImportSettings } from "./settings_groups/import_settings.tsx";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import { useSettings } from "./settings_context.ts";

export function Settings() {
    const { t } = useTranslation();
    const { settings, updateSettings } = useSettings();
    const { audioEngine } = useAudioEngine();

    const handleChange = (changes: Partial<SavedSettingsType>) => {
        audioEngine.applySettings(updateSettings(changes));
    };

    return (
        <div className={"settings"}>
            <h1>{t("settingsLocale.settings")}</h1>
            <div className={"settings_display"}>
                <AudioEngineSettings
                    settings={settings}
                    onChange={handleChange}
                />
                <InterfaceSettings
                    settings={settings}
                    onChange={handleChange}
                />
                <ImportSettings settings={settings} onChange={handleChange} />
                <MidiSettings />
            </div>
        </div>
    );
}
