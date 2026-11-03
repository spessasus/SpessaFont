import type { ThemeType } from "../themes/theme_list.ts";

/**
 * Sets the theme on the root element, where the files in `src/themes/` read it.
 * It lives outside React so the audio engine overlay and the first paint are themed too.
 * The browser and installed app title bar follow the menu bar color.
 */
export function applyTheme(theme: ThemeType) {
    const root = document.documentElement;
    root.dataset.theme = theme;
    const menuBarColor = getComputedStyle(root)
        .getPropertyValue("--menu-bar-color")
        .trim();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && menuBarColor.length > 0) {
        meta.setAttribute("content", menuBarColor);
    }
}
