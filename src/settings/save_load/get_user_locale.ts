import { LocaleList } from "../../locale/locale_list.ts";
import { UNSET_LANGUAGE } from "./settings_typedef.ts";

export const DEFAULT_LOCALE = "en";

const SUPPORTED_LOCALES = Object.keys(LocaleList);

/**
 * Picks the first browser language the app has a translation for, or the default locale.
 */
export function getUserLocale(supportedLocales: string[]): string {
    const preferredLocales = (navigator.languages || [navigator.language]).map(
        (l) => l.split("-", 1)[0].toLowerCase()
    );
    for (const locale of preferredLocales)
        if (supportedLocales.includes(locale)) return locale;

    return DEFAULT_LOCALE;
}

/**
 * The locale to show for the saved language setting.
 */
export function resolveLocale(lang: string) {
    return lang === UNSET_LANGUAGE ? getUserLocale(SUPPORTED_LOCALES) : lang;
}
