import * as React from "react";
import { typedMemo } from "../utils/typed_memo.ts";

interface MenuBarProps {
    main: string;
    children?: React.ReactNode;
}

export const MenuBarIcon = typedMemo(
    ({
        text,
        click,
        children
    }: {
        text: string;
        click?: () => void;
        children?: React.ReactNode;
    }) => {
        return (
            <div onClick={click} className={"menu_bar_icon"}>
                {children}
                <span>{text}</span>
            </div>
        );
    }
);

export function MenuBarDropdown({ main, children }: MenuBarProps) {
    return (
        <div className={"menu_bar"}>
            <div className={"menu_bar_button"} title={main}>
                {main}
            </div>
            <div className={"menu_bar_contents"}>{children}</div>
        </div>
    );
}
