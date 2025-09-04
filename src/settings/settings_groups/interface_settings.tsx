import type { GroupSettingsProps } from "./audio_engine_settings.tsx";
import { Setting } from "../setting.tsx";
import { LocaleList } from "../../locale/locale_list.ts";
import {
    getSetting,
    type ThemeType,
    UNSET_LANGUAGE
} from "../save_load/settings_typedef.ts";
import { useTranslation } from "react-i18next";
import { getUserLocale } from "../save_load/get_user_locale.ts";
import { logInfo } from "../../utils/core_utils.ts";

type interfaceSettingsProps = GroupSettingsProps & {
    setTheme: (t: ThemeType) => void;
};

export function InterfaceSettings({
    settings,
    updateSettings,
    setTheme
}: interfaceSettingsProps) {
    const { t, i18n } = useTranslation();

    let language = getSetting("lang", settings);
    if (language === UNSET_LANGUAGE) {
        language = getUserLocale();
    }

    function setLanguage(code: string) {
        logInfo(`Changing language to: ${code}`);
        void i18n.changeLanguage(code).then(() => {
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

    return (
        <div className={"settings_group hover_brightness"}>
            <h2>{t("settingsLocale.interface.title")}</h2>
            <Setting locale={"settingsLocale.interface.language"}>
                <select
                    onChange={(e) => setLanguage(e.target.value)}
                    className={"pretty_input monospaced"}
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
                    onChange={(e) => setAppTheme(e.target.value as ThemeType)}
                    className={"pretty_input monospaced"}
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
    );
}
