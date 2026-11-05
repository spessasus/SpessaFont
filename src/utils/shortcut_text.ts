import { IS_MAC } from "./environment_detection.ts";

/**
 * How a Ctrl (Cmd on macOS) shortcut is written in menus, like "Ctrl+Shift+Z" or "⇧⌘Z".
 * Key names are not translated, they match what is printed on the keys.
 */
export function shortcutText(key: string, isShift = false) {
    if (IS_MAC) {
        return `${isShift ? "⇧" : ""}⌘${key}`;
    }
    return `Ctrl+${isShift ? "Shift+" : ""}${key}`;
}

/**
 * The key that deletes the list selection, as printed on it. Mac keyboards label Backspace
 * "delete", and their forward delete needs Fn.
 */
export const DELETE_KEY_TEXT = IS_MAC ? "⌫" : "Del";

/**
 * Whether the key is the one that deletes the list selection (Backspace too on macOS).
 */
export function isDeleteKey(e: KeyboardEvent) {
    return e.key === "Delete" || (IS_MAC && e.key === "Backspace");
}
