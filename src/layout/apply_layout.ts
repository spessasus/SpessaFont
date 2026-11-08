import type { LayoutMode } from "./layout_setting.ts";

/**
 * Sets the layout on the root element, where the phone CSS files read it.
 * It lives outside React so the first paint already has the right layout.
 */
export function applyLayout(mode: LayoutMode) {
    document.documentElement.dataset.layout = mode;
}
