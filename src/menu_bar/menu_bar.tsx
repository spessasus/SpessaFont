import { MenuBarDropdown, MenuBarIcon } from "./dropdown.tsx";
import { MIDIPlayer } from "./midi_player.tsx";
import { VoiceDisplay } from "./voice_display.tsx";
import "./menu_bar.css";
import { useTranslation } from "react-i18next";
import {
    CloseFileIcon,
    DeleteIcon,
    Discord,
    FullscreenIcon,
    Gear,
    GitHub,
    InfoIcon,
    LinkIcon,
    NewFileIcon,
    OpenFileIcon,
    RedoIcon,
    SaveFileIcon,
    UndoIcon
} from "../utils/icons.tsx";
import { IS_CHROME, IS_ELECTRON } from "../utils/environment_detection.ts";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { useEventListener } from "../hooks/use_event_listener.ts";
import { showToastDialog } from "../toasts/show_toast_dialog.tsx";
import { logError } from "../utils/core_utils.ts";
import { useBankCommands } from "./use_bank_commands.ts";

interface MenuBarProps {
    session: BankSession | undefined;
    /**
     * Selects an element in the active tab, used for the focus hints of undo and redo.
     */
    setView: (view: BankEditView) => void;
    showMidiPlayer: boolean;
    onToggleSettings: () => void;
    onToggleKeyboard: () => void;
    onOpenFile: () => void;
    onNewFile: () => void;
    onCloseFile: () => void;
}

export function MenuBar({
    session,
    setView,
    showMidiPlayer,
    onToggleSettings,
    onToggleKeyboard,
    onOpenFile,
    onNewFile,
    onCloseFile
}: MenuBarProps) {
    const fLoc = "menuBarLocale.file.";
    const eLoc = "menuBarLocale.edit.";
    const { t } = useTranslation();
    const { undo, redo, save, removeUnusedElements, autoLinkSamples } =
        useBankCommands(session, setView);

    useEventListener(document, "keydown", (e) => {
        if (!session || !(e.ctrlKey || e.metaKey)) {
            return;
        }
        switch (e.key) {
            case "z": {
                e.preventDefault();
                undo();
                break;
            }
            case "y": {
                e.preventDefault();
                redo();
                break;
            }
            case "s": {
                e.preventDefault();
                save("auto");
                break;
            }
        }
    });

    const showAbout = () => {
        showToastDialog({
            content: (
                <>
                    <span>
                        <strong>{t("titleMessage")}</strong>
                    </span>
                    <span>{t("welcome.copyrightTwo")}</span>
                    <span>{"v" + __APP_VERSION__}</span>
                </>
            ),
            buttons: [{ label: t(fLoc + "close") }]
        });
    };

    const enterFullscreen = async () => {
        try {
            await document.body.requestFullscreen();
        } catch (error) {
            logError("Failed to enter fullscreen.", error);
        }
    };

    return (
        <div className={"menu_bar_main"}>
            <MenuBarDropdown main={t(fLoc + "file")}>
                <MenuBarIcon onClick={onNewFile} text={t(fLoc + "new")}>
                    <NewFileIcon />
                </MenuBarIcon>
                <MenuBarIcon onClick={onOpenFile} text={t(fLoc + "open")}>
                    <OpenFileIcon />
                </MenuBarIcon>
                {session && (
                    <>
                        <MenuBarIcon
                            onClick={onCloseFile}
                            text={t(fLoc + "close")}
                        >
                            <CloseFileIcon />
                        </MenuBarIcon>

                        <MenuBarIcon
                            onClick={() => save("auto")}
                            text={t(fLoc + "save")}
                        >
                            <SaveFileIcon />
                        </MenuBarIcon>
                        <MenuBarIcon
                            onClick={() => save("sf2")}
                            text={t(fLoc + "saveSF2")}
                        >
                            <SaveFileIcon />
                        </MenuBarIcon>
                        <MenuBarIcon
                            onClick={() => save("dls")}
                            text={t(fLoc + "saveDLS")}
                        >
                            <SaveFileIcon format={"DLS"} />
                        </MenuBarIcon>
                        <MenuBarIcon
                            onClick={() => save("sf3")}
                            text={t(fLoc + "saveSF3")}
                        >
                            <SaveFileIcon format={"SF3"} />
                        </MenuBarIcon>
                        <MenuBarIcon
                            onClick={() => save("sf4")}
                            text={t(fLoc + "saveSFE")}
                        >
                            <SaveFileIcon format={"SFe"} />
                        </MenuBarIcon>
                    </>
                )}
                <MenuBarIcon
                    onClick={() => void enterFullscreen()}
                    text={t(fLoc + "fullscreen")}
                >
                    <FullscreenIcon />
                </MenuBarIcon>
                <MenuBarIcon onClick={showAbout} text={t(fLoc + "about")}>
                    <InfoIcon />
                </MenuBarIcon>
            </MenuBarDropdown>
            {session && (
                <MenuBarDropdown main={t(eLoc + "edit")}>
                    <MenuBarIcon onClick={undo} text={t(eLoc + "undo")}>
                        <UndoIcon />
                    </MenuBarIcon>
                    <MenuBarIcon onClick={redo} text={t(eLoc + "redo")}>
                        <RedoIcon />
                    </MenuBarIcon>
                    <MenuBarIcon
                        onClick={removeUnusedElements}
                        text={t(eLoc + "removeUnusedElements")}
                    >
                        <DeleteIcon />
                    </MenuBarIcon>
                    <MenuBarIcon
                        text={t(eLoc + "autoLinkSamples")}
                        onClick={autoLinkSamples}
                    >
                        <LinkIcon />
                    </MenuBarIcon>
                </MenuBarDropdown>
            )}
            {showMidiPlayer && <MIDIPlayer />}
            <a
                className={"menu_bar_button"}
                href={"https://spessasus.github.io/SpessaSynth"}
                target={"_blank"}
            >
                {"SpessaSynth"}
            </a>
            {IS_CHROME && !IS_ELECTRON && (
                <MenuBarDropdown main={t("firefox")}></MenuBarDropdown>
            )}
            <div className={"menu_bar_spacer"}></div>
            <a
                className={"menu_bar_button"}
                href={"https://github.com/spessasus/SpessaFont"}
                target={"_blank"}
                title={t("githubPage")}
                aria-label={t("githubPage")}
            >
                <GitHub />
            </a>
            <a
                className={"menu_bar_button"}
                href={"https://discord.gg/TAVVxMFnsn"}
                target={"_blank"}
                title={t("discord")}
                aria-label={t("discord")}
            >
                <Discord />
            </a>
            <button
                type={"button"}
                className={"menu_bar_button"}
                onClick={onToggleKeyboard}
            >
                {t("keyboard")}
            </button>
            <VoiceDisplay />
            <button
                type={"button"}
                className={"menu_bar_button settings_button"}
                onClick={onToggleSettings}
                title={t("settingsLocale.settings")}
                aria-label={t("settingsLocale.settings")}
            >
                <Gear />
            </button>
        </div>
    );
}
