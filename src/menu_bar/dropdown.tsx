import { useTranslation } from "react-i18next";

type MenuBarProps = {
    main: string;
    contents: string[];
};

export function MenuBarDropdown({ main, contents }: MenuBarProps) {
    const { t } = useTranslation();
    return (
        <div className={"menu_bar"}>
            <div className={"menu_bar_button"} title={t(main)}>
                {t(main)}
            </div>
            <div className={"menu_bar_contents"}>
                {contents.map((c, i) => {
                    return (
                        <div key={i} className={"menu_bar_item"}>
                            {t(c)}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
