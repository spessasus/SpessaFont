import type { ContextMenuItem } from "./context_menu_context.ts";
import { ChevronRightIcon } from "../utils/icons/app_icons.tsx";
import { MenuIcon } from "./menu_icon.tsx";

interface ActionSheetItemProps {
    item: ContextMenuItem;
    onClose?: () => void;
}

export function ActionSheetItem({ item, onClose }: ActionSheetItemProps) {
    const secondLine = item.isDisabled
        ? (item.disabledReason ?? item.description)
        : item.description;
    return (
        <button
            type="button"
            role="menuitem"
            className="plain_button action_sheet_item"
            data-destructive={item.isDestructive ? "" : undefined}
            disabled={item.isDisabled}
            onClick={() => {
                onClose?.();
                item.onSelect();
            }}
        >
            <span className="action_sheet_icon" aria-hidden="true">
                {item.icon ? <MenuIcon name={item.icon} /> : item.iconNode}
            </span>
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
