import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import i18next from "i18next";
import type { SavedSettingsType } from "./save_load/settings_typedef.ts";
import { saveSettings } from "./save_load/save.ts";
import { resolveLocale } from "./save_load/get_user_locale.ts";
import { applyTheme } from "./apply_theme.ts";
import { SettingsContext } from "./settings_context.ts";
import { logError, logInfo } from "../utils/core_utils.ts";

async function changeLanguage(locale: string) {
    logInfo(`Changing language to: ${locale}`);
    try {
        await i18next.changeLanguage(locale);
    } catch (error) {
        logError("Failed to change the language.", error);
    }
}

interface SettingsProviderProps {
    initialSettings: SavedSettingsType;
    children?: ReactNode;
}

export function SettingsProvider({
    initialSettings,
    children
}: SettingsProviderProps) {
    const [settings, setSettings] = useState(initialSettings);

    const value = useMemo(
        () => ({
            settings,
            updateSettings: (changes: Partial<SavedSettingsType>) => {
                const next = { ...settings, ...changes };
                saveSettings(next);
                if (next.theme !== settings.theme) {
                    applyTheme(next.theme);
                }
                if (next.lang !== settings.lang) {
                    void changeLanguage(resolveLocale(next.lang));
                }
                setSettings(next);
                return next;
            }
        }),
        [settings]
    );

    return <SettingsContext value={value}>{children}</SettingsContext>;
}
