import type { GroupSettingsProps } from "./audio_engine_settings.tsx";
import { Setting } from "../setting.tsx";
import { LocaleList } from "../../locale/locale_list.ts";
import type { ThemeType } from "../save_load/settings_typedef.ts";
import { useTranslation } from "react-i18next";
import { resolveLocale } from "../save_load/get_user_locale.ts";

const THEME_OPTIONS = {
    dark: "settingsLocale.interface.dark",
    light: "settingsLocale.interface.light"
} as const satisfies Record<ThemeType, string>;

function isTheme(value: string): value is ThemeType {
    return Object.hasOwn(THEME_OPTIONS, value);
}

export function InterfaceSettings({ settings, onChange }: GroupSettingsProps) {
    const { t } = useTranslation();

    return (
        <div className={"settings_group hover_brightness"}>
            <h2>{t("settingsLocale.interface.title")}</h2>
            <Setting label={t("settingsLocale.interface.language")}>
                <select
                    onChange={(e) => onChange({ lang: e.target.value })}
                    className={"pretty_input monospaced"}
                    value={resolveLocale(settings.lang)}
                >
                    {Object.entries(LocaleList).map(([code, locale]) => (
                        <option key={code} value={code}>
                            {locale.name}
                        </option>
                    ))}
                </select>
            </Setting>

            <Setting label={t("settingsLocale.interface.theme")}>
                <select
                    onChange={(e) => {
                        if (isTheme(e.target.value)) {
                            onChange({ theme: e.target.value });
                        }
                    }}
                    className={"pretty_input monospaced"}
                    value={settings.theme}
                >
                    {Object.entries(THEME_OPTIONS).map(([theme, key]) => (
                        <option key={theme} value={theme}>
                            {t(key)}
                        </option>
                    ))}
                </select>
            </Setting>
        </div>
    );
}
