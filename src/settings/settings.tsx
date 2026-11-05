import { useTranslation } from "react-i18next";
import "./settings.css";
import type { SavedSettingsType } from "./save_load/settings_typedef.ts";
import { AudioEngineSettings } from "./settings_groups/audio_engine_settings.tsx";
import { InterfaceSettings } from "./settings_groups/interface_settings.tsx";
import { MIDISettings } from "./settings_groups/midi_settings.tsx";
import { ImportSettings } from "./settings_groups/import_settings.tsx";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import { useSettings } from "./settings_context.ts";
import type { BankSession } from "../core_backend/bank_session.ts";
import { showToastDialog } from "../toasts/show_toast_dialog.tsx";
import { reloadWithSampleRate } from "../utils/sample_rate_param.ts";

interface SettingsProps {
    /**
     * The open banks, which a sample rate change closes.
     */
    openSessions: readonly BankSession[];
}

export function Settings({ openSessions }: SettingsProps) {
    const { t } = useTranslation();
    const { settings, updateSettings } = useSettings();
    const { audioEngine } = useAudioEngine();

    /**
     * The page reloads to change the rate, so it asks first when that would close banks.
     */
    const changeSampleRate = (rate: number) => {
        if (openSessions.length === 0) {
            reloadWithSampleRate(rate);
            return;
        }
        const unsaved = openSessions.filter(
            (session) => session.history.isDirty
        ).length;
        showToastDialog({
            content: (
                <span>
                    {t("settingsLocale.audioEngine.sampleRateReload")}
                    {unsaved > 0
                        ? " " +
                          t("settingsLocale.audioEngine.sampleRateUnsaved", {
                              count: unsaved
                          })
                        : null}
                </span>
            ),
            isError: unsaved > 0,
            buttons: [
                {
                    label: t("settingsLocale.audioEngine.reloadWithRate", {
                        rate
                    }),
                    onClick: () => reloadWithSampleRate(rate)
                },
                {
                    label: t("settingsLocale.audioEngine.keepRate", {
                        rate: settings.sampleRate
                    })
                }
            ]
        });
    };

    const handleChange = (changes: Partial<SavedSettingsType>) => {
        const { sampleRate } = changes;
        if (sampleRate !== undefined && sampleRate !== settings.sampleRate) {
            changeSampleRate(sampleRate);
            return;
        }
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
                <MIDISettings />
            </div>
        </div>
    );
}
