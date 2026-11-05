import { createContext, useContext } from "react";

export interface ToolsMenuSlot {
    /**
     * The place in the menu bar for the shown element's tools menu.
     */
    node: HTMLElement | null;
    /**
     * Closes the settings when they cover the editor, so a tool shows what it changed.
     */
    onReveal: () => void;
}

export const ToolsMenuSlotContext = createContext<ToolsMenuSlot | null>(null);

export function useToolsMenuSlot() {
    const ctx = useContext(ToolsMenuSlotContext);
    if (!ctx) throw new Error("Used without ToolsMenuSlotContext!");
    return ctx;
}
