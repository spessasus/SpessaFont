import { useTranslation } from "react-i18next";
import * as React from "react";

type MenuBarProps = {
    main: string;
    children: React.ReactNode;
};

export function MenuBarItem({
    text,
    click
}: {
    text: string;
    click?: () => void;
}) {
    const { t } = useTranslation();
    return (
        <div onClick={click} className={"menu_bar_item"}>
            {t(text)}
        </div>
    );
}

export function MenuBarDropdown({ main, children }: MenuBarProps) {
    const { t } = useTranslation();
    return (
        <div className={"menu_bar"}>
            <div className={"menu_bar_button"} title={t(main)}>
                {t(main)}
            </div>
            <div className={"menu_bar_contents"}>{children}</div>
        </div>
    );
}
