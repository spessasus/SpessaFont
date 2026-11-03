/**
 * The interface themes. The colors live in `src/themes/`, one CSS file per theme,
 * keyed by the theme ID. The IDs are saved in the settings, so never rename one.
 */
export interface ThemeInfo {
    /**
     * The display name, shown untranslated like a locale name.
     */
    name: string;
    /**
     * Groups the theme in the settings.
     */
    scheme: "dark" | "light";
}

export const THEME_LIST = {
    dark: { name: "SpessaFont Dark", scheme: "dark" },
    light: { name: "SpessaFont Light", scheme: "light" },
    modern_dark: { name: "Modern Dark", scheme: "dark" },
    modern_light: { name: "Modern Light", scheme: "light" },
    teal: { name: "Teal", scheme: "dark" },
    purple: { name: "Purple", scheme: "dark" },
    orange: { name: "Orange", scheme: "dark" },
    dark_blue: { name: "Dark Blue", scheme: "dark" },
    dark_green: { name: "Dark Green", scheme: "dark" },
    grayscale: { name: "Grayscale", scheme: "dark" },
    pink: { name: "Pink", scheme: "light" },
    light_blue: { name: "Light Blue", scheme: "light" },
    light_green: { name: "Light Green", scheme: "light" },
    sepia: { name: "Sepia", scheme: "light" },
    ugly: { name: "Ugly", scheme: "light" }
} as const satisfies Record<string, ThemeInfo>;

export type ThemeType = keyof typeof THEME_LIST;

export function isTheme(value: unknown): value is ThemeType {
    return typeof value === "string" && Object.hasOwn(THEME_LIST, value);
}
