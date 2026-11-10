import type { ReactNode } from "react";
import { ActionSheetItem } from "../context_menu/action_sheet_item.tsx";
import { useLayout } from "../layout/layout_context.ts";

interface MenuBarIconProps {
    text: string;
    title?: string;
    onClick?: () => void;
    /**
     * The keys that do the same, shown after the text.
     */
    shortcut?: string;
    isDisabled?: boolean;
    children?: ReactNode;
}

export function MenuBarIcon({
    text,
    title,
    onClick,
    shortcut,
    isDisabled = false,
    children
}: MenuBarIconProps) {
    const layout = useLayout();
    if (layout === "phone") {
        return (
            <ActionSheetItem
                hasIconSlot={true}
                item={{
                    label: text,
                    description: title,
                    shortcut,
                    isDisabled,
                    iconNode: children,
                    onSelect: () => onClick?.()
                }}
            />
        );
    }
    return (
        <button
            type={"button"}
            role={"menuitem"}
            // The arrow keys move between the items, Tab leaves the menu
            tabIndex={-1}
            onClick={onClick}
            title={title}
            disabled={isDisabled}
            className={"menu_bar_icon"}
        >
            {/* The icon is decoration, the text names the item */}
            <span className={"menu_bar_icon_graphic"} aria-hidden={true}>
                {children}
            </span>
            <span className={"menu_bar_icon_text"}>{text}</span>
            {shortcut ? (
                <kbd className={"menu_bar_shortcut"}>{shortcut}</kbd>
            ) : null}
        </button>
    );
}
