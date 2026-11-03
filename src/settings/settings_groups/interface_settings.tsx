import type { GroupSettingsProps } from "./audio_engine_settings.tsx";
import { Setting } from "../setting.tsx";
import { LocaleList } from "../../locale/locale_list.ts";
import {
    isTheme,
    THEME_LIST,
    type ThemeInfo
} from "../../themes/theme_list.ts";
import { useTranslation } from "react-i18next";
import { resolveLocale } from "../save_load/get_user_locale.ts";

const THEME_ENTRIES = Object.entries(THEME_LIST);

const SCHEME_LABELS = {
    dark: "settingsLocale.interface.dark",
    light: "settingsLocale.interface.light"
} as const satisfies Record<ThemeInfo["scheme"], string>;

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
                    {Object.entries(SCHEME_LABELS).map(([scheme, key]) => (
                        <optgroup key={scheme} label={t(key)}>
                            {THEME_ENTRIES.filter(
                                ([, theme]) => theme.scheme === scheme
                            ).map(([id, theme]) => (
                                <option key={id} value={id}>
                                    {theme.name}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </Setting>
        </div>
    );
}
