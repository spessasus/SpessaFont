const IS_MAC = /mac|iphone|ipad/i.test(navigator.userAgent);

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
