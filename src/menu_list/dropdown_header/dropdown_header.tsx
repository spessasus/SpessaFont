import "./dropdown_header.css";
import "./dropdown_header_phone.css";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { CopyIcon, PasteIcon } from "../../utils/icons/edit_icons.tsx";
import {
    ChevronDownIcon,
    ChevronUpIcon,
    MoreVerticalIcon,
    PlusIcon
} from "../../utils/icons/app_icons.tsx";
import { useLayout } from "../../layout/layout_context.ts";
import { useContextMenu } from "../../context_menu/context_menu_context.ts";

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
    /**
     * The number of elements in the list, shown after the title on phones.
     */
    count?: number;
    /**
     * Enters selection mode from the phone's section menu. The entry does nothing without it.
     */
    onSelect?: () => void;
}

export function DropdownHeader({
    text,
    isOpen,
    onToggle,
    addLabel,
    addHint = addLabel,
    onAdd,
    onCopy,
    onPaste,
    count,
    onSelect
}: DropdownHeaderProps) {
    const { t } = useTranslation();
    const layout = useLayout();
    const { openMenu } = useContextMenu();
    const isPhone = layout === "phone";
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
                    {isPhone && count !== undefined ? (
                        <span className={"item_group_count monospaced"}>
                            {count}
                        </span>
                    ) : null}
                </button>
            </h2>
            <div className={"left_buttons"}>
                <button
                    type={"button"}
                    className={
                        isPhone ? "plain_button svg_wrapper" : "plain_button"
                    }
                    title={onAdd ? addLabel : addHint}
                    aria-label={addLabel}
                    // On phones a disabled button stays tappable, to say why
                    disabled={!isPhone && !onAdd}
                    aria-disabled={isPhone && !onAdd ? true : undefined}
                    onClick={isPhone && !onAdd ? () => toast(addHint) : onAdd}
                >
                    {isPhone ? <PlusIcon /> : "+"}
                </button>
                {isPhone ? null : (
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
                )}
            </div>
            <div className={"right_buttons"}>
                {isPhone ? (
                    <button
                        type={"button"}
                        className={"plain_button svg_wrapper"}
                        aria-label={t("phoneLocale.appBar.more")}
                        aria-haspopup={"menu"}
                        onClick={(e) =>
                            openMenu(
                                e,
                                [
                                    {
                                        label: t("copy"),
                                        icon: "copy",
                                        isDisabled: !onCopy,
                                        disabledReason: t(
                                            "presetList.copyHint"
                                        ),
                                        onSelect: () => onCopy?.()
                                    },
                                    {
                                        label: t("paste"),
                                        icon: "paste",
                                        isDisabled: !onPaste,
                                        disabledReason: t(
                                            "presetList.pasteHint"
                                        ),
                                        onSelect: () => onPaste?.()
                                    },
                                    {
                                        label: t(
                                            "phoneLocale.selection.select"
                                        ),
                                        onSelect: () => onSelect?.()
                                    }
                                ],
                                { title: text }
                            )
                        }
                    >
                        <MoreVerticalIcon />
                    </button>
                ) : (
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
                )}
                <button
                    type={"button"}
                    className={"plain_button dropdown_triangle"}
                    title={isOpen ? t("collapse") : t("expand")}
                    aria-label={isOpen ? t("collapse") : t("expand")}
                    onClick={onToggle}
                >
                    {isPhone ? (
                        isOpen ? (
                            <ChevronUpIcon />
                        ) : (
                            <ChevronDownIcon />
                        )
                    ) : isOpen ? (
                        "\u{25B2}"
                    ) : (
                        "\u{25BC}"
                    )}
                </button>
            </div>
        </div>
    );
}
