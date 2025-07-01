import { MenuBarDropdown, MenuBarItem } from "./dropdown.tsx";
import type SoundBankManager from "../core_backend/sound_bank_manager.ts";
import { MIDIPlayer } from "./midi_player.tsx";
import { VoiceDisplay } from "./voice_display.tsx";
import "./menu_bar.css";
import { useTranslation } from "react-i18next";
import type { AudioEngine } from "../core_backend/audio_engine.ts";
import { Gear } from "./gear.tsx";
import { type RefObject, useCallback, useEffect } from "react";
import type { BankEditorRef } from "../bank_editor/bank_editor.tsx";

// @ts-expect-error chromium check is here
const isChrome: boolean = window["chrome"] !== undefined;

export function MenuBar({
    toggleSettings,
    audioEngine,
    openTab,
    closeTab,
    manager,
    showMidiPlayer,
    toggleKeyboard,
    setIsLoading,
    savingRef,
    bankEditorRef
}: {
    audioEngine: AudioEngine;
    toggleSettings: () => void;
    openTab: (b?: File) => void;
    closeTab: () => void;
    manager: SoundBankManager;
    showMidiPlayer: boolean;
    toggleKeyboard: () => void;
    setIsLoading: (l: boolean) => unknown;
    savingRef: RefObject<HTMLSpanElement | null>;
    bankEditorRef: BankEditorRef;
}) {
    const fLoc = "menuBarLocale.file.";
    const eLoc = "menuBarLocale.edit.";
    const { t } = useTranslation();

    function openFile() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".sf2,.dls,.sf3,.sfogg";
        input.click();
        input.onchange = async () => {
            const file: File | undefined = input.files?.[0];
            if (!file) {
                return;
            }
            openTab(file);
        };
    }

    const progressFunc = useCallback(
        async (_s: string, n: number, c: number) => {
            if (savingRef.current) {
                savingRef.current.textContent = `${((n / c) * 100).toFixed()}%`;
            }
        },
        [savingRef]
    );

    function newFile() {
        openTab();
    }

    const sf2 = useCallback(() => {
        setIsLoading(true);
        setTimeout(() => {
            manager.save("sf2", progressFunc).then(() => setIsLoading(false));
        }, 200);
    }, [manager, progressFunc, setIsLoading]);

    function dls() {
        setIsLoading(true);
        setTimeout(() => {
            manager.save("dls", progressFunc).then(() => setIsLoading(false));
        }, 200);
    }

    function sf3() {
        setIsLoading(true);
        setTimeout(() => {
            manager.save("sf3", progressFunc).then(() => setIsLoading(false));
        }, 200);
    }

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
                        sf2();
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
    }, [manager, sf2]);

    return (
        <div className={"menu_bar_main"}>
            <MenuBarDropdown main={fLoc + "file"}>
                <MenuBarItem click={newFile} text={fLoc + "new"}></MenuBarItem>
                <MenuBarItem
                    click={openFile}
                    text={fLoc + "open"}
                ></MenuBarItem>
                <MenuBarItem
                    click={closeTab}
                    text={fLoc + "close"}
                ></MenuBarItem>
                <MenuBarItem click={sf2} text={fLoc + "saveSF2"} />
                <MenuBarItem click={dls} text={fLoc + "saveDLS"} />
                <MenuBarItem click={sf3} text={fLoc + "saveSF3"} />
                <MenuBarItem
                    click={() => document.body.requestFullscreen()}
                    text={fLoc + "fullscreen"}
                />
                <MenuBarItem text={"v" + __APP_VERSION__} />
            </MenuBarDropdown>
            <MenuBarDropdown main={eLoc + "edit"}>
                <MenuBarItem
                    click={() => manager.undo()}
                    text={eLoc + "undo"}
                />
                <MenuBarItem
                    click={() => manager.redo()}
                    text={eLoc + "redo"}
                />
                <MenuBarItem
                    click={() => bankEditorRef?.current?.removeUnusedElements()}
                    text={eLoc + "removeUnusedElements"}
                />
                <MenuBarItem
                    text={eLoc + "autoLinkSamples"}
                    click={() => bankEditorRef?.current?.autoLinkSamples()}
                />
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
            {isChrome && <MenuBarDropdown main={"firefox"}></MenuBarDropdown>}
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
