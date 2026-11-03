import { createContext, type MouseEvent, useContext } from "react";

export interface ContextMenuItem {
    label: string;
    onSelect: () => void;
    isDisabled?: boolean;
}

/**
 * A menu entry, or a line between groups of entries.
 */
export type ContextMenuEntry = ContextMenuItem | "separator";

export interface ContextMenuAPI {
    /**
     * Opens the menu at the pointer, or under the element for the keyboard menu key.
     */
    openMenu: (event: MouseEvent, entries: readonly ContextMenuEntry[]) => void;
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
