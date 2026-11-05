import { useTranslation } from "react-i18next";
import { MenuBarDropdown } from "./menu_bar_dropdown.tsx";
import { MenuBarIcon } from "./menu_bar_icon.tsx";
import {
    DeleteIcon,
    LinkIcon,
    RedoIcon,
    UndoIcon
} from "../utils/icons/edit_icons.tsx";
import type { BankStore } from "../core_backend/bank_store.ts";
import { useHistoryState } from "../hooks/use_history_state.ts";
import { shortcutText } from "../utils/shortcut_text.ts";
import { HISTORY_LABEL_KEYS } from "./history_label_keys.ts";

interface EditMenuProps {
    store: BankStore;
    onUndo: () => void;
    onRedo: () => void;
    onRemoveUnusedElements: () => void;
    onAutoLinkSamples: () => void;
    onMergeDuplicateSamples: () => void;
}

export function EditMenu({
    store,
    onUndo,
    onRedo,
    onRemoveUnusedElements,
    onAutoLinkSamples,
    onMergeDuplicateSamples
}: EditMenuProps) {
    const { t } = useTranslation();
    const { canUndo, canRedo, undoLabel, redoLabel } = useHistoryState(store);
    return (
        <MenuBarDropdown main={t("menuBarLocale.edit.edit")}>
            <MenuBarIcon
                onClick={onUndo}
                text={
                    undoLabel
                        ? t("menuBarLocale.edit.undoWhat", {
                              what: t(HISTORY_LABEL_KEYS[undoLabel])
                          })
                        : t("menuBarLocale.edit.undo")
                }
                shortcut={shortcutText("Z")}
                isDisabled={!canUndo}
            >
                <UndoIcon />
            </MenuBarIcon>
            <MenuBarIcon
                onClick={onRedo}
                text={
                    redoLabel
                        ? t("menuBarLocale.edit.redoWhat", {
                              what: t(HISTORY_LABEL_KEYS[redoLabel])
                          })
                        : t("menuBarLocale.edit.redo")
                }
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
                onClick={onMergeDuplicateSamples}
                text={t("menuBarLocale.edit.mergeDuplicateSamples")}
            >
                <LinkIcon />
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
