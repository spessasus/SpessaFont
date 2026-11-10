import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
    ChevronDownIcon,
    ChevronUpIcon,
    MoreVerticalIcon,
    PlusIcon
} from "../../utils/icons/app_icons.tsx";
import { useContextMenu } from "../../context_menu/context_menu_context.ts";
import type { DropdownHeaderProps } from "./dropdown_header_props.ts";

/**
 * The phone's section header: the count after the title, an add icon that stays tappable when
 * disabled to say why, and a menu with Copy, Paste and Select.
 */
export function PhoneDropdownHeader({
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
    const { openMenu } = useContextMenu();
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
                    {count === undefined ? null : (
                        <span className={"item_group_count monospaced"}>
                            {count}
                        </span>
                    )}
                </button>
            </h2>
            <div className={"left_buttons"}>
                <button
                    type={"button"}
                    className={"plain_button svg_wrapper"}
                    title={onAdd ? addLabel : addHint}
                    aria-label={addLabel}
                    // A disabled button stays tappable, to say why
                    aria-disabled={onAdd ? undefined : true}
                    onClick={onAdd ?? (() => toast(addHint))}
                >
                    <PlusIcon />
                </button>
            </div>
            <div className={"right_buttons"}>
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
                                    disabledReason: t("presetList.copyHint"),
                                    onSelect: () => onCopy?.()
                                },
                                {
                                    label: t("paste"),
                                    icon: "paste",
                                    isDisabled: !onPaste,
                                    disabledReason: t("presetList.pasteHint"),
                                    onSelect: () => onPaste?.()
                                },
                                {
                                    label: t("phoneLocale.selection.select"),
                                    onSelect: () => onSelect?.()
                                }
                            ],
                            { title: text }
                        )
                    }
                >
                    <MoreVerticalIcon />
                </button>
                <button
                    type={"button"}
                    className={"plain_button dropdown_triangle"}
                    title={isOpen ? t("collapse") : t("expand")}
                    aria-label={isOpen ? t("collapse") : t("expand")}
                    onClick={onToggle}
                >
                    {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                </button>
            </div>
        </div>
    );
}
