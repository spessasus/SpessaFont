import { useTranslation } from "react-i18next";
import type { GroupSettingsProps } from "./audio_engine_settings.tsx";
import { Setting } from "../setting.tsx";

/**
 * What happens to the audio of imported samples.
 */
export function ImportSettings({ settings, onChange }: GroupSettingsProps) {
    const { t } = useTranslation();
    return (
        <div className={"settings_group hover_brightness"}>
            <h2>{t("settingsLocale.sampleImport.title")}</h2>
            <Setting label={t("settingsLocale.sampleImport.removeSilence")}>
                <input
                    type={"checkbox"}
                    checked={settings.removeImportSilence}
                    onChange={(e) =>
                        onChange({ removeImportSilence: e.target.checked })
                    }
                />
            </Setting>
            <Setting label={t("settingsLocale.sampleImport.trimAfterLoop")}>
                <input
                    type={"checkbox"}
                    checked={settings.trimImportAfterLoop}
                    onChange={(e) =>
                        onChange({ trimImportAfterLoop: e.target.checked })
                    }
                />
            </Setting>
        </div>
    );
}
