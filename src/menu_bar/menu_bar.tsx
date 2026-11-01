import { MenuBarDropdown, MenuBarIcon } from "./dropdown.tsx";
import { MIDIPlayer } from "./midi_player.tsx";
import { VoiceDisplay } from "./voice_display.tsx";
import "./menu_bar.css";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect } from "react";
import { ACCEPTED_SOUNDBANK_FORMATS } from "../utils/accepted_formats.ts";
import toast from "react-hot-toast";
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
import type { SaveFormat } from "../core_backend/persistence.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import {
    createAutoLinkActions,
    createRemoveUnusedActions
} from "../core_backend/bank_maintenance.ts";
import { logError } from "../utils/core_utils.ts";

const waitForRefresh = () => new Promise((r) => setTimeout(r, 200));

export function MenuBar({
    toggleSettings,
    openTab,
    closeTab,
    session,
    setView,
    showMidiPlayer,
    toggleKeyboard
}: {
    toggleSettings: () => void;
    openTab: (b?: File) => void;
    closeTab: () => void;
    session: BankSession | undefined;
    /**
     * Selects an element in the active tab, used for the focus hints of undo and redo.
     */
    setView: (view: BankEditView) => void;
    showMidiPlayer: boolean;
    toggleKeyboard: () => void;
}) {
    const fLoc = "menuBarLocale.file.";
    const eLoc = "menuBarLocale.edit.";
    const { t } = useTranslation();

    function openFile() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ACCEPTED_SOUNDBANK_FORMATS;
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

    const performSave = useCallback(
        async (format: SaveFormat) => {
            if (!session) return;
            const id = toast.loading(t("loadingAndSaving.savingSoundBank"));
            await waitForRefresh();
            try {
                await session.save(
                    format,
                    t("bankInfo.unnamed"),
                    (progress) => {
                        toast.loading(
                            `${t("loadingAndSaving.writingSamples")} (${
                                Math.floor(progress * 10_000) / 100 + "%"
                            })`,
                            {
                                id
                            }
                        );
                    }
                );
            } catch (error) {
                if (
                    error instanceof DOMException &&
                    error.name === "AbortError"
                ) {
                    // the user closed the file picker
                    toast.dismiss(id);
                    return;
                }
                logError("Failed to save the sound bank.", error);
                // make so the error appears at the bottom
                toast.error(String(error));
                toast.error(t("loadingAndSaving.writingFailed"), { id });
                return;
            }
            toast.success(t("loadingAndSaving.savedSuccessfully"), { id });
        },
        [session, t]
    );

    const undo = useCallback(() => {
        if (!session) return;
        if (!session.history.canUndo) {
            toast(t(eLoc + "nothingToUndo"));
            return;
        }
        const focus = session.history.undo();
        if (focus) setView(focus);
    }, [eLoc, session, setView, t]);

    const redo = useCallback(() => {
        if (!session) return;
        if (!session.history.canRedo) {
            toast(t(eLoc + "nothingToRedo"));
            return;
        }
        const focus = session.history.redo();
        if (focus) setView(focus);
    }, [eLoc, session, setView, t]);

    const removeUnusedElements = () => {
        if (!session) return;
        const { actions, instrumentCount, sampleCount } =
            createRemoveUnusedActions(session.document);
        // The selection only changes if the selected element was removed
        session.history.do(actions);
        toast.success(
            t("soundBankLocale.removedElements", {
                instruments: instrumentCount,
                samples: sampleCount
            })
        );
    };

    const autoLinkSamples = () => {
        if (!session) return;
        const actions = createAutoLinkActions(session.document.samples);
        if (actions.length === 0) {
            toast(t("soundBankLocale.noSamplesWereChanged"));
            return;
        }
        session.history.do(actions);
        toast.success(
            t("soundBankLocale.modifiedSamples", {
                count: actions.length
            })
        );
    };

    const saveWithToasts = useCallback(
        (format: SaveFormat) => {
            if (!session) return;
            if (
                format === "sf2" &&
                session.document.samples.some((s) => s.isCompressed)
            ) {
                toast(
                    (tost) => (
                        <div className={"toast_col"}>
                            <span>{t(fLoc + "warnSF2")}</span>
                            <span
                                onClick={() => {
                                    toast.dismiss(tost.id);
                                    void performSave(format);
                                }}
                                className={"pretty_outline"}
                            >
                                {t("yes")}
                            </span>
                            <span
                                onClick={() => toast.dismiss(tost.id)}
                                className={"pretty_outline"}
                            >
                                {t("no")}
                            </span>
                        </div>
                    ),
                    {
                        duration: Infinity
                    }
                );
            } else void performSave(format);
        },
        [session, performSave, t]
    );

    // keybinds

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (!session) {
                return;
            }
            if (e.ctrlKey || e.metaKey) {
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
                        void saveWithToasts("auto");
                        break;
                    }
                    default: {
                        return;
                    }
                }
            }
        }

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [redo, saveWithToasts, session, undo]);

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
                {session && (
                    <>
                        <MenuBarIcon click={closeTab} text={t(fLoc + "close")}>
                            <CloseFileIcon />
                        </MenuBarIcon>

                        <MenuBarIcon
                            click={() => void saveWithToasts("auto")}
                            text={t(fLoc + "save")}
                        >
                            <SaveFileIcon />
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
                            click={() => void saveWithToasts("sf4")}
                            text={t(fLoc + "saveSFE")}
                        >
                            <SaveFileIcon format={"SFe"} />
                        </MenuBarIcon>
                    </>
                )}
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
            {session && (
                <>
                    <MenuBarDropdown main={t(eLoc + "edit")}>
                        <MenuBarIcon click={undo} text={t(eLoc + "undo")}>
                            <UndoIcon />
                        </MenuBarIcon>
                        <MenuBarIcon click={redo} text={t(eLoc + "redo")}>
                            <RedoIcon />
                        </MenuBarIcon>
                        <MenuBarIcon
                            click={removeUnusedElements}
                            text={t(eLoc + "removeUnusedElements")}
                        >
                            <DeleteIcon />
                        </MenuBarIcon>
                        <MenuBarIcon
                            text={t(eLoc + "autoLinkSamples")}
                            click={autoLinkSamples}
                        >
                            <LinkIcon />
                        </MenuBarIcon>
                    </MenuBarDropdown>
                </>
            )}
            {showMidiPlayer && <MIDIPlayer></MIDIPlayer>}
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
            <div style={{ flex: 1 }}></div>
            <a
                className={"menu_bar_button"}
                href={"https://github.com/spessasus/SpessaFont"}
                target={"_blank"}
                title={t("githubPage")}
            >
                <GitHub />
            </a>
            <a
                className={"menu_bar_button"}
                href={"https://discord.gg/TAVVxMFnsn"}
                target={"_blank"}
                title={t("discord")}
            >
                <Discord />
            </a>
            <div className={"menu_bar_button"} onClick={toggleKeyboard}>
                {t("keyboard")}
            </div>
            <VoiceDisplay />
            <div
                className={"menu_bar_button settings_button"}
                onClick={toggleSettings}
            >
                <Gear />
            </div>
        </div>
    );
}
