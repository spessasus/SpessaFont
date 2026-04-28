export function getUserLocale(supportedLocales: string[]): string {
    const preferredLocales = (navigator.languages || [navigator.language]).map(
        (l) => l.split("-")[0].toLowerCase()
    );
    for (const locale of preferredLocales)
        if (supportedLocales.includes(locale)) return locale;

    return navigator.language || DEFAULT_LOCALE;
}

export const DEFAULT_LOCALE = "en";
