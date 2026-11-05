import type { ReactNode } from "react";

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
