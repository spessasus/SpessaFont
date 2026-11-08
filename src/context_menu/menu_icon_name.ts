export const MENU_ICON_NAMES = {
    copy: "copy",
    cut: "cut",
    paste: "paste",
    delete: "delete",
    duplicate: "duplicate",
    link: "link",
    edit: "edit",
    open: "open",
    new: "new",
    save: "save",
    undo: "undo",
    redo: "redo",
    play: "play",
    settings: "settings",
    fullscreen: "fullscreen",
    info: "info",
    download: "download"
} as const;

/**
 * The icons a menu entry can ask for.
 */
export type MenuIconName =
    (typeof MENU_ICON_NAMES)[keyof typeof MENU_ICON_NAMES];
