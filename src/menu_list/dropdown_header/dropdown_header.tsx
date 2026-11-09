import "./dropdown_header.css";
import "./dropdown_header_phone.css";
import { useTranslation } from "react-i18next";
import { CopyIcon, PasteIcon } from "../../utils/icons/edit_icons.tsx";
import { useLayout } from "../../layout/layout_context.ts";
import type { DropdownHeaderProps } from "./dropdown_header_props.ts";
import { PhoneDropdownHeader } from "./phone_dropdown_header.tsx";

export function DropdownHeader(props: DropdownHeaderProps) {
    const { t } = useTranslation();
    const layout = useLayout();
    if (layout === "phone") {
        return <PhoneDropdownHeader {...props} />;
    }
    const {
        text,
        isOpen,
        onToggle,
        addLabel,
        addHint = addLabel,
        onAdd,
        onCopy,
        onPaste
    } = props;
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
