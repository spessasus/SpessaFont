import "./dropdown_header.css";
import { useTranslation } from "react-i18next";
import { CopyIcon, PasteIcon } from "../../utils/icons/edit_icons.tsx";

interface DropdownHeaderProps {
    text: string;
    isOpen: boolean;
    onToggle: () => void;
    /**
     * What the add button does, the list's own words ("Import Audio Files…").
     */
    addLabel: string;
    /**
     * Why the add button is disabled, shown on it instead of the label.
     */
    addHint?: string;
    /**
     * The add button is disabled when this is not set. The buttons stay in place, so the header
     * does not change its layout with the selection.
     */
    onAdd?: () => void;
    onCopy?: () => void;
    onPaste?: () => void;
}

export function DropdownHeader({
    text,
    isOpen,
    onToggle,
    addLabel,
    addHint = addLabel,
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
                <button
                    type={"button"}
                    className={"plain_button"}
                    title={onAdd ? addLabel : addHint}
                    aria-label={addLabel}
                    disabled={!onAdd}
                    onClick={onAdd}
                >
                    +
                </button>
                <button
                    type={"button"}
                    className={"plain_button svg_wrapper copy"}
                    title={onCopy ? t("copy") : t("presetList.copyHint")}
                    aria-label={t("copy")}
                    disabled={!onCopy}
                    onClick={onCopy}
                >
                    <CopyIcon />
                </button>
            </div>
            <div className={"right_buttons"}>
                <button
                    type={"button"}
                    className={"plain_button svg_wrapper"}
                    title={onPaste ? t("paste") : t("presetList.pasteHint")}
                    aria-label={t("paste")}
                    disabled={!onPaste}
                    onClick={onPaste}
                >
                    <PasteIcon />
                </button>
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
