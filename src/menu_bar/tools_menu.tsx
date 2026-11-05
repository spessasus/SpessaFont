import type { MouseEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { MenuBarDropdown } from "./menu_bar_dropdown.tsx";
import { useToolsMenuSlot } from "./tools_menu_slot.ts";

interface ToolsMenuProps {
    title: string;
    children: ReactNode;
}

/**
 * The shown element's tools as a menu bar menu. The editor renders it, so the tools keep the
 * editor's context and state, and a portal puts it into the menu bar.
 */
export function ToolsMenu({ title, children }: ToolsMenuProps) {
    const { node, onReveal } = useToolsMenuSlot();
    if (!node) {
        return null;
    }
    // Capturing, so the settings make way before the tool runs, like the Edit menu
    const handleClickCapture = (e: MouseEvent) => {
        if (
            e.target instanceof Element &&
            e.target.closest("[role=menuitem]") !== null
        ) {
            onReveal();
        }
    };
    return createPortal(
        <div className={"tools_menu"} onClickCapture={handleClickCapture}>
            <MenuBarDropdown main={title}>{children}</MenuBarDropdown>
        </div>,
        node
    );
}
