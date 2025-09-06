import { MenuBarDropdown, MenuBarIcon } from "./dropdown.tsx";
import type SoundBankManager from "../core_backend/sound_bank_manager.ts";
import { MIDIPlayer } from "./midi_player.tsx";
import { VoiceDisplay } from "./voice_display.tsx";
import "./menu_bar.css";
import { useTranslation } from "react-i18next";
import type { AudioEngine } from "../core_backend/audio_engine.ts";
import { useCallback, useEffect } from "react";
import type { BankEditorRef } from "../bank_editor/bank_editor.tsx";
import { ACCEPTED_FORMATS } from "../utils/accepted_formats.ts";
import toast from "react-hot-toast";
import {
    CloseFileIcon,
    DeleteIcon,
    FullscreenIcon,
    Gear,
    InfoIcon,
    LinkIcon,
    NewFileIcon,
    OpenFileIcon,
    RedoIcon,
    SaveFileIcon,
    UndoIcon
} from "../utils/icons.tsx";
import type { ProgressFunction } from "spessasynth_core";

// @ts-expect-error chromium check is here
const isChrome: boolean = window.chrome !== undefined;

const waitForRefresh = () => new Promise((r) => setTimeout(r, 200));

export function MenuBar({
    toggleSettings,
    audioEngine,
    openTab,
    closeTab,
    manager,
    showMidiPlayer,
    toggleKeyboard,
    bankEditorRef
}: {
    audioEngine: AudioEngine;
    toggleSettings: () => void;
    openTab: (b?: File) => void;
    closeTab: () => void;
    manager: SoundBankManager;
    showMidiPlayer: boolean;
    toggleKeyboard: () => void;
    bankEditorRef: BankEditorRef;
}) {
    const fLoc = "menuBarLocale.file.";
    const eLoc = "menuBarLocale.edit.";
    const { t } = useTranslation();

    function openFile() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ACCEPTED_FORMATS;
        input.click();
        input.onchange = () => {
            const file: File | undefined = input.files?.[0];
            if (!file) {
                return;
            }
            openTab(file);
        };
    }

    function newFile() {
        openTab();
    }

    const saveWithToasts = useCallback(
        async (format: "sf2" | "dls" | "sf3") => {
            const id = toast.loading(t("loadingAndSaving.savingSoundBank"));
            await waitForRefresh();
            try {
                await manager.save(format, ((
                    _sampleName,
                    writtenCount,
                    totalSampleCount
                ) => {
                    toast.loading(
                        `${t("loadingAndSaving.writingSamples")} (${
                            Math.floor(
                                (writtenCount / totalSampleCount) * 100_00
                            ) /
                                100 +
                            "%"
                        })`,
                        {
                            id
                        }
                    );
                }) as ProgressFunction);
            } catch (e) {
                // make so the error appears at the bottom
                toast.error(`${e as string}`);
                toast.error(t("loadingAndSaving.writingFailed"), { id });
                return;
            }
            toast.success(t("loadingAndSaving.savedSuccessfully"), { id });
        },
        [manager, t]
    );

    // keybinds

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (!manager) {
                return;
            }
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case "z":
                        e.preventDefault();
                        manager.undo();
                        break;
                    case "y":
                        e.preventDefault();
                        manager.redo();
                        break;
                    case "s":
                        e.preventDefault();
                        void saveWithToasts("sf2");
                        break;
                    default:
                        return;
                }
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [manager, saveWithToasts]);

    const about = useCallback(() => {
        toast(
            (tost) => (
                <div className={"toast_col"}>
                    <span>
                        <strong>{t("titleMessage")}</strong>
                    </span>
                    <span>{t("welcome.copyrightTwo")}</span>
                    <span>{"v" + __APP_VERSION__}</span>
                    <span
                        onClick={() => toast.dismiss(tost.id)}
                        className={"pretty_outline"}
                    >
                        {t(fLoc + "close")}
                    </span>
                </div>
            ),
            {
                duration: Infinity
            }
        );
    }, [t]);

    return (
        <div className={"menu_bar_main"}>
            <MenuBarDropdown main={t(fLoc + "file")}>
                <MenuBarIcon click={newFile} text={t(fLoc + "new")}>
                    <NewFileIcon />
                </MenuBarIcon>
                <MenuBarIcon click={openFile} text={t(fLoc + "open")}>
                    <OpenFileIcon />
                </MenuBarIcon>
                <MenuBarIcon click={closeTab} text={t(fLoc + "close")}>
                    <CloseFileIcon />
                </MenuBarIcon>
                <MenuBarIcon
                    click={() => void saveWithToasts("sf2")}
                    text={t(fLoc + "saveSF2")}
                >
                    <SaveFileIcon />
                </MenuBarIcon>
                <MenuBarIcon
                    click={() => void saveWithToasts("dls")}
                    text={t(fLoc + "saveDLS")}
                >
                    <SaveFileIcon format={"DLS"} />
                </MenuBarIcon>
                <MenuBarIcon
                    click={() => void saveWithToasts("sf3")}
                    text={t(fLoc + "saveSF3")}
                >
                    <SaveFileIcon format={"SF3"} />
                </MenuBarIcon>
                <MenuBarIcon
                    click={() => void document.body.requestFullscreen()}
                    text={t(fLoc + "fullscreen")}
                >
                    <FullscreenIcon />
                </MenuBarIcon>
                <MenuBarIcon click={about} text={t(fLoc + "about")}>
                    <InfoIcon />
                </MenuBarIcon>
            </MenuBarDropdown>
            <MenuBarDropdown main={t(eLoc + "edit")}>
                <MenuBarIcon
                    click={() => {
                        if (manager.history.length < 1) {
                            toast(t(eLoc + "nothingToUndo"));
                        }
                        manager.undo();
                    }}
                    text={t(eLoc + "undo")}
                >
                    <UndoIcon />
                </MenuBarIcon>
                <MenuBarIcon
                    click={() => {
                        if (manager.history.undoLength < 1) {
                            toast(t(eLoc + "nothingToRedo"));
                        }
                        manager.redo();
                    }}
                    text={t(eLoc + "redo")}
                >
                    <RedoIcon />
                </MenuBarIcon>
                <MenuBarIcon
                    click={() => bankEditorRef?.current?.removeUnusedElements()}
                    text={t(eLoc + "removeUnusedElements")}
                >
                    <DeleteIcon />
                </MenuBarIcon>
                <MenuBarIcon
                    text={t(eLoc + "autoLinkSamples")}
                    click={() => bankEditorRef?.current?.autoLinkSamples()}
                >
                    <LinkIcon />
                </MenuBarIcon>
            </MenuBarDropdown>
            {showMidiPlayer && (
                <MIDIPlayer audioEngine={audioEngine}></MIDIPlayer>
            )}
            <a
                className={"menu_bar_button"}
                href={"https://github.com/spessasus/SpessaFont"}
                target={"_blank"}
            >
                {t("githubPage")}
            </a>
            <a
                className={"menu_bar_button"}
                href={"https://spessasus.github.io/SpessaSynth"}
                target={"_blank"}
            >
                {"SpessaSynth"}
            </a>
            {isChrome && (
                <MenuBarDropdown main={t("firefox")}></MenuBarDropdown>
            )}
            <div style={{ flex: 1 }}></div>
            <div className={"menu_bar_button"} onClick={toggleKeyboard}>
                {t("keyboard")}
            </div>
            <VoiceDisplay
                analyser={audioEngine.analyser}
                processor={audioEngine.processor}
            ></VoiceDisplay>
            <div
                className={"menu_bar_button settings_button"}
                onClick={toggleSettings}
            >
                <Gear />
            </div>
        </div>
    );
}
