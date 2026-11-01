import type { ReactNode } from "react";

interface MenuBarIconProps {
    text: string;
    onClick?: () => void;
    children?: ReactNode;
}

export function MenuBarIcon({ text, onClick, children }: MenuBarIconProps) {
    return (
        <button type={"button"} onClick={onClick} className={"menu_bar_icon"}>
            {children}
            <span>{text}</span>
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
