import { useTranslation } from "react-i18next";
import { MenuBarDropdown, MenuBarIcon } from "./dropdown.tsx";
import {
    DeleteIcon,
    LinkIcon,
    RedoIcon,
    UndoIcon
} from "../utils/icons/edit_icons.tsx";

interface EditMenuProps {
    onUndo: () => void;
    onRedo: () => void;
    onRemoveUnusedElements: () => void;
    onAutoLinkSamples: () => void;
}

export function EditMenu({
    onUndo,
    onRedo,
    onRemoveUnusedElements,
    onAutoLinkSamples
}: EditMenuProps) {
    const { t } = useTranslation();
    return (
        <MenuBarDropdown main={t("menuBarLocale.edit.edit")}>
            <MenuBarIcon onClick={onUndo} text={t("menuBarLocale.edit.undo")}>
                <UndoIcon />
            </MenuBarIcon>
            <MenuBarIcon onClick={onRedo} text={t("menuBarLocale.edit.redo")}>
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
