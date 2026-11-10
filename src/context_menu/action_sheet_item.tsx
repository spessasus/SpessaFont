import { useEffect, useRef } from "react";
import type { ContextMenuItem } from "./context_menu_context.ts";
import { ChevronRightIcon } from "../utils/icons/app_icons.tsx";
import { MenuIcon } from "./menu_icon.tsx";

interface ActionSheetItemProps {
    item: ContextMenuItem;
    /**
     * Whether the row keeps the icon column, true when any entry of the sheet has an icon.
     */
    hasIconSlot: boolean;
    onClose?: () => void;
}

export function ActionSheetItem({
    item,
    hasIconSlot,
    onClose
}: ActionSheetItemProps) {
    const ref = useRef<HTMLButtonElement>(null);
    const { isCurrent } = item;
    useEffect(() => {
        // A long sheet opens with its current entry in view
        if (isCurrent) {
            ref.current?.scrollIntoView({ block: "nearest" });
        }
    }, [isCurrent]);
    const secondLine = item.isDisabled
        ? (item.disabledReason ?? item.description)
        : item.description;
    return (
        <button
            ref={ref}
            type="button"
            role="menuitem"
            className="plain_button action_sheet_item"
            aria-current={isCurrent ? "true" : undefined}
            data-destructive={item.isDestructive ? "" : undefined}
            disabled={item.isDisabled}
            onClick={() => {
                onClose?.();
                item.onSelect();
            }}
        >
            {hasIconSlot ? (
                <span className="action_sheet_icon" aria-hidden="true">
                    {item.icon ? <MenuIcon name={item.icon} /> : item.iconNode}
                </span>
            ) : null}
            <span className="action_sheet_text">
                <span className="action_sheet_label">{item.label}</span>
                {secondLine ? (
                    <span className="action_sheet_second">{secondLine}</span>
                ) : null}
            </span>
            {item.hasSubmenu ? (
                <span className="action_sheet_chevron" aria-hidden="true">
                    <ChevronRightIcon />
                </span>
            ) : null}
        </button>
    );
}
