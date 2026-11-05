import { useTranslation } from "react-i18next";
import { MenuBarDropdown, MenuBarIcon } from "./dropdown.tsx";
import {
    DeleteIcon,
    LinkIcon,
    RedoIcon,
    UndoIcon
} from "../utils/icons/edit_icons.tsx";
import type { BankStore } from "../core_backend/bank_store.ts";
import { useHistoryState } from "../hooks/use_history_state.ts";
import { shortcutText } from "../utils/shortcut_text.ts";

interface EditMenuProps {
    store: BankStore;
    onUndo: () => void;
    onRedo: () => void;
    onRemoveUnusedElements: () => void;
    onAutoLinkSamples: () => void;
}

export function EditMenu({
    store,
    onUndo,
    onRedo,
    onRemoveUnusedElements,
    onAutoLinkSamples
}: EditMenuProps) {
    const { t } = useTranslation();
    const { canUndo, canRedo } = useHistoryState(store);
    return (
        <MenuBarDropdown main={t("menuBarLocale.edit.edit")}>
            <MenuBarIcon
                onClick={onUndo}
                text={t("menuBarLocale.edit.undo")}
                shortcut={shortcutText("Z")}
                isDisabled={!canUndo}
            >
                <UndoIcon />
            </MenuBarIcon>
            <MenuBarIcon
                onClick={onRedo}
                text={t("menuBarLocale.edit.redo")}
                shortcut={shortcutText("Y")}
                isDisabled={!canRedo}
            >
                <RedoIcon />
            </MenuBarIcon>
            <MenuBarIcon
                onClick={onRemoveUnusedElements}
                text={t("menuBarLocale.edit.removeUnusedElements")}
            >
                <DeleteIcon />
            </MenuBarIcon>
            <MenuBarIcon
                onClick={onAutoLinkSamples}
                text={t("menuBarLocale.edit.autoLinkSamples")}
            >
                <LinkIcon />
            </MenuBarIcon>
        </MenuBarDropdown>
    );
}
