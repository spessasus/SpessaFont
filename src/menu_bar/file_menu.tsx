import { useTranslation } from "react-i18next";
import { MenuBarDropdown } from "./menu_bar_dropdown.tsx";
import { MenuBarIcon } from "./menu_bar_icon.tsx";
import {
    CloseFileIcon,
    FullscreenIcon,
    InfoIcon,
    NewFileIcon,
    OpenFileIcon,
    SaveFileIcon
} from "../utils/icons/file_icons.tsx";
import type { SaveFormat } from "../core_backend/persistence.ts";
import { shortcutText } from "../utils/shortcut_text.ts";
import { enterFullscreen } from "./enter_fullscreen.ts";
import { showAbout } from "./show_about.tsx";

interface FileMenuProps {
    /**
     * Closing and saving are only shown with a bank open.
     */
    isBankOpen: boolean;
    onNewFile: () => void;
    onOpenFile: () => void;
    onCloseFile: () => void;
    onSave: (format: SaveFormat) => void;
}

export function FileMenu({
    isBankOpen,
    onNewFile,
    onOpenFile,
    onCloseFile,
    onSave
}: FileMenuProps) {
    const { t } = useTranslation();

    return (
        <MenuBarDropdown main={t("menuBarLocale.file.file")}>
            <MenuBarIcon onClick={onNewFile} text={t("menuBarLocale.file.new")}>
                <NewFileIcon />
            </MenuBarIcon>
            <MenuBarIcon
                onClick={onOpenFile}
                text={t("menuBarLocale.file.open")}
            >
                <OpenFileIcon />
            </MenuBarIcon>
            {isBankOpen ? (
                <>
                    <MenuBarIcon
                        onClick={onCloseFile}
                        text={t("menuBarLocale.file.close")}
                    >
                        <CloseFileIcon />
                    </MenuBarIcon>
                    <MenuBarIcon
                        onClick={() => onSave("auto")}
                        text={t("menuBarLocale.file.save")}
                        shortcut={shortcutText("S")}
                    >
                        <SaveFileIcon />
                    </MenuBarIcon>
                    <MenuBarIcon
                        onClick={() => onSave("sf2")}
                        text={t("menuBarLocale.file.saveSF2")}
                    >
                        <SaveFileIcon />
                    </MenuBarIcon>
                    <MenuBarIcon
                        onClick={() => onSave("dls")}
                        text={t("menuBarLocale.file.saveDLS")}
                    >
                        <SaveFileIcon format={"DLS"} />
                    </MenuBarIcon>
                    <MenuBarIcon
                        onClick={() => onSave("sf3")}
                        text={t("menuBarLocale.file.saveSF3")}
                    >
                        <SaveFileIcon format={"SF3"} />
                    </MenuBarIcon>
                    <MenuBarIcon
                        onClick={() => onSave("sf4")}
                        text={t("menuBarLocale.file.saveSFE")}
                    >
                        <SaveFileIcon format={"SFe"} />
                    </MenuBarIcon>
                </>
            ) : null}
            <MenuBarIcon
                onClick={() => void enterFullscreen()}
                text={t("menuBarLocale.file.fullscreen")}
            >
                <FullscreenIcon />
            </MenuBarIcon>
            <MenuBarIcon
                onClick={() => showAbout(t)}
                text={t("menuBarLocale.file.about")}
            >
                <InfoIcon />
            </MenuBarIcon>
        </MenuBarDropdown>
    );
}
