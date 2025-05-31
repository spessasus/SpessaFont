export function getUserLocale(): string {
    return navigator.language.split("-")[0].toLowerCase();
}

export const DEFAULT_LOCALE = "en";
