import {
    createContext,
    type MouseEvent,
    type ReactNode,
    useContext
} from "react";
import type { MenuIconName } from "./menu_icon_name.ts";

export interface ContextMenuItem {
    label: string;
    onSelect: () => void;
    isDisabled?: boolean;
    /**
     * The keys that do the same, shown next to the label.
     */
    shortcut?: string;
    /**
     * A second line under the label, shown in the phone action sheet.
     */
    description?: string;
    /**
     * Why the entry is disabled, shown under the label in the phone action sheet.
     */
    disabledReason?: string;
    icon?: MenuIconName;
    /**
     * A ready-made icon, shown when there is no named one.
     */
    iconNode?: ReactNode;
    isDestructive?: boolean;
}

export interface ContextMenuOptions {
    /**
     * What the menu acts on, the action sheet's title.
     */
    title?: string;
}

/**
 * A menu entry, or a line between groups of entries.
 */
export type ContextMenuEntry = ContextMenuItem | "separator";

export interface ContextMenuAPI {
    /**
     * Opens the menu at the pointer, or under the element for the keyboard menu key.
     */
    openMenu: (
        event: MouseEvent,
        entries: readonly ContextMenuEntry[],
        options?: ContextMenuOptions
    ) => void;
}

export const ContextMenuContext = createContext<ContextMenuAPI | null>(null);

/**
 * The shared right-click menu. A long press opens it on touch screens.
 */
export function useContextMenu() {
    const menu = useContext(ContextMenuContext);
    if (!menu) {
        throw new Error("Used without ContextMenuProvider context!");
    }
    return menu;
}
