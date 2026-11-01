import type { ThemeType } from "./save_load/settings_typedef.ts";

/**
 * Sets the theme on the root element, where `src/index.css` reads it.
 * It lives outside React so the audio engine overlay and the first paint are themed too.
 */
export function applyTheme(theme: ThemeType) {
    document.documentElement.dataset.theme = theme;
}
