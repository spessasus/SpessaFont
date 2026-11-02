import "./dropdown_header.css";
import { useTranslation } from "react-i18next";
import { CopyIcon, PasteIcon } from "../../utils/icons/edit_icons.tsx";

interface DropdownHeaderProps {
    text: string;
    isOpen: boolean;
    onToggle: () => void;
    /**
     * Shows the add button when set.
     */
    onAdd?: () => void;
    /**
     * Shows the copy button when set.
     */
    onCopy?: () => void;
    /**
     * Shows the paste button when set.
     */
    onPaste?: () => void;
}

export function DropdownHeader({
    text,
    isOpen,
    onToggle,
    onAdd,
    onCopy,
    onPaste
}: DropdownHeaderProps) {
    const { t } = useTranslation();
    return (
        <div className={`item_group_header hover_brightness`}>
            <h2>
                <button
                    type={"button"}
                    className={"plain_button item_group_title"}
                    aria-expanded={isOpen}
                    onClick={onToggle}
                >
                    {text}
                </button>
            </h2>
            <div className={"left_buttons"}>
                {onAdd ? (
                    <button
                        type={"button"}
                        className={"plain_button"}
                        title={t("addNew")}
                        aria-label={t("addNew")}
                        onClick={onAdd}
                    >
                        +
                    </button>
                ) : null}
                {onCopy ? (
                    <button
                        type={"button"}
                        className={"plain_button svg_wrapper copy"}
                        title={t("copy")}
                        aria-label={t("copy")}
                        onClick={onCopy}
                    >
                        <CopyIcon />
                    </button>
                ) : null}
            </div>
            <div className={"right_buttons"}>
                {onPaste ? (
                    <button
                        type={"button"}
                        className={"plain_button svg_wrapper"}
                        title={t("paste")}
                        aria-label={t("paste")}
                        onClick={onPaste}
                    >
                        <PasteIcon />
                    </button>
                ) : null}
                <button
                    type={"button"}
                    className={"plain_button dropdown_triangle"}
                    title={isOpen ? t("collapse") : t("expand")}
                    aria-label={isOpen ? t("collapse") : t("expand")}
                    onClick={onToggle}
                >
                    {isOpen ? "\u{25B2}" : "\u{25BC}"}
                </button>
            </div>
        </div>
    );
}
