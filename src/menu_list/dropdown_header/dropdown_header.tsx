import "./dropdown_header.css";
import { useTranslation } from "react-i18next";
import { CopyIcon, PasteIcon } from "../../utils/icons.tsx";

export function DropdownHeader({
    text,
    open,
    onAdd,
    onClick,
    copy,
    onCopy,
    paste,
    onPaste,
    add = true
}: {
    text: string;
    open: boolean;
    onClick: () => unknown;
    onAdd: () => unknown;
    copy: boolean;
    onCopy: () => unknown;
    paste: boolean;
    onPaste: () => unknown;
    add?: boolean;
}) {
    const { t } = useTranslation();
    return (
        <div onClick={onClick} className={`item_group_header`}>
            <div className={"left_buttons"}>
                {add && (
                    <div
                        title={t("addNew")}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onAdd();
                        }}
                    >
                        +
                    </div>
                )}
                {copy && (
                    <div
                        className={"svg_wrapper copy"}
                        title={t("copy")}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onCopy();
                        }}
                    >
                        <CopyIcon />
                    </div>
                )}
            </div>

            <h2>{text}</h2>
            <div className={"right_buttons"}>
                {paste && (
                    <div
                        className={"svg_wrapper"}
                        title={t("paste")}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onPaste();
                        }}
                    >
                        <PasteIcon />
                    </div>
                )}
                <div
                    className={"dropdown_triangle"}
                    title={open ? t("collapse") : t("expand")}
                >
                    {open ? "\u25B2" : "\u25BC"}
                </div>
            </div>
        </div>
    );
}
