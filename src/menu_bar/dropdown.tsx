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
            onClick={onClick}
            title={title}
            disabled={isDisabled}
            className={"menu_bar_icon"}
        >
            {children}
            <span>{text}</span>
            {shortcut ? (
                <kbd className={"menu_bar_shortcut"}>{shortcut}</kbd>
            ) : null}
        </button>
    );
}

interface MenuBarDropdownProps {
    main: string;
    children?: ReactNode;
}

export function MenuBarDropdown({ main, children }: MenuBarDropdownProps) {
    return (
        <div className={"menu_bar"}>
            {/* Focusing the button opens the menu (CSS focus-within) for keyboard users */}
            <button type={"button"} className={"menu_bar_button"}>
                {main}
            </button>
            <div className={"menu_bar_contents"}>{children}</div>
        </div>
    );
}
