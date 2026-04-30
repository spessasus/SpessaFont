import { MenuBar } from "./menu_bar/menu_bar.tsx";
import {
    getSetting,
    type SavedSettingsType
} from "./settings/save_load/settings_typedef.ts";
import { useTranslation } from "react-i18next";
import SoundBankManager from "./core_backend/sound_bank_manager.ts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardManager } from "./core_backend/clipboard_manager.ts";
import { Settings } from "./settings/settings.tsx";
import { TabList } from "./tab_list/tab_list.tsx";
import { KeyboardController } from "./keyboard/keyboard_controller.tsx";
import { DestinationsOptions } from "./utils/translated_options/destination_options.tsx";
import { ModulableControllerOptions } from "./utils/translated_options/modulable_controller_options.tsx";
import { BankEditor, type BankEditorRef } from "./bank_editor/bank_editor.tsx";
import { ACCEPTED_FORMATS } from "./utils/accepted_formats.ts";
import { loadSoundBank } from "./core_backend/load_sound_bank.ts";
import type { BasicSoundBank, GenericRange } from "spessasynth_core";
import toast, { Toaster } from "react-hot-toast";
import "./toasts.css";
import { Welcome } from "./welcome/welcome.tsx";
import type { ElectronAPI } from "./types/electron.ts";
import { IS_CHROME, IS_ELECTRON } from "./utils/environment_detection.ts";
import { useAudioEngine } from "./core_backend/audio_engine_context.ts"; // apply locale

// shared clipboard
const clipboardManager = new ClipboardManager();

interface LaunchParams {
    files: readonly FileSystemFileHandle[];
}

interface LaunchQueue {
    setConsumer(consumer: (params: LaunchParams) => void): void;
}

interface GlobalThisLaunch {
    launchQueue?: LaunchQueue;
}

// Service workers are unsafe on electron
if (navigator.serviceWorker && !IS_ELECTRON) {
    await navigator.serviceWorker.register("service-worker.js");
    console.info("Registered service worker");
}

function App({ initialSettings }: { initialSettings: SavedSettingsType }) {
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();
    const [tabs, setTabs] = useState<SoundBankManager[]>([]);
    const [showKeyboard, setShowKeyboard] = useState(false);
    const [settings, setSettings] = useState(false);
    const [theme, setTheme] = useState(getSetting("theme", initialSettings));
    const [activeTab, setActiveTab] = useState<number>(0); // index in tabs[]
    const bankEditorRef: BankEditorRef = useRef(null);
    const [splits, setSplits] = useState<GenericRange[]>([]);

    const currentManager: SoundBankManager | undefined = useMemo(
        () => tabs[activeTab],
        [activeTab, tabs]
    );

    // cached translated options
    // note: I can't use JSX here as it calls MCO 9 times for some reason?
    const ccOptions = useMemo(
        () => ModulableControllerOptions({ t: t, padLength: 5 }),
        [t]
    );
    const destinationOptions = useMemo(
        () => <>{DestinationsOptions({ t: t })}</>,
        [t]
    );

    // Theme change, on #root for audio provider to be themed as well
    useEffect(() => {
        switch (theme) {
            default:
            case "dark": {
                document.querySelector("#root")!.classList.remove("light_mode");
                break;
            }

            case "light": {
                document.querySelector("#root")!.classList.add("light_mode");
            }
        }
    });

    // Pause MIDI when unloading tabs
    useEffect(() => {
        if (tabs.length > 0 && tabs[activeTab])
            tabs[activeTab].sendBankToSynth();
        else audioEngine.pauseMIDI();
    }, [activeTab, audioEngine, tabs]);

    const toggleSettings = () => setSettings(!settings);

    useEffect(() => {
        function handleUnload(e: BeforeUnloadEvent) {
            if (tabs.some((t) => t.dirty)) {
                e.preventDefault();
            }
        }

        window.addEventListener("beforeunload", handleUnload);
        return () => {
            window.removeEventListener("beforeunload", handleUnload);
        };
    }, [tabs]);

    const openNewBankTab = useCallback(
        async (bankFile?: File) => {
            const id = toast.loading(t("loadingAndSaving.loadingFileFromDisk"));
            let bank: BasicSoundBank | undefined = undefined;
            if (bankFile instanceof File) {
                if (
                    bankFile.size > 2_147_483_648 &&
                    IS_CHROME &&
                    !IS_ELECTRON
                ) {
                    // this not anti-chrome code,
                    // loading 4GB sound banks throws NotReadable error,
                    // uncomment this code and try it for yourself
                    toast.dismiss(id);
                    toast.error(t("loadingAndSaving.chromeError"));
                    return;
                }
                try {
                    const buffer = await bankFile.arrayBuffer();
                    toast.loading(t("loadingAndSaving.parsingSoundBank"), {
                        id
                    });
                    await new Promise((r) => setTimeout(r, 100));
                    bank = loadSoundBank(buffer);
                } catch (error) {
                    console.error(error);
                    toast.dismiss(id);
                    if ((error as Error).name === "NotReadableError") {
                        // special Electron error
                        toast.error(t("loadingAndSaving.electronError"));
                    } else {
                        // make so the error appears at the bottom
                        toast.error(`${error as string}`);
                        toast.error(
                            t("loadingAndSaving.errorLoadingSoundBank")
                        );
                    }
                    return;
                }
            }

            // will automatically create an empty bank if not provided
            const newManager = new SoundBankManager(
                audioEngine.processor,
                audioEngine.sequencer,
                bank
            );
            toast.dismiss(id);
            newManager.sendBankToSynth();
            setTabs((prev) => [newManager, ...prev]);
            setActiveTab(0); // newly added tab
        },
        [audioEngine.processor, audioEngine.sequencer, t]
    );

    // Electron ready signal
    useEffect(() => {
        if (IS_ELECTRON && "electronAPI" in globalThis) {
            const api = (globalThis as unknown as { electronAPI: ElectronAPI })
                .electronAPI;
            api.appReady();
        }
    }, []);

    // Loading files with electron or launch queue
    useEffect(() => {
        if ("launchQueue" in globalThis) {
            const launch = (globalThis as GlobalThisLaunch).launchQueue!;
            launch.setConsumer(async (launchParams) => {
                await audioEngine.context.resume();
                for (const fileHandle of launchParams.files) {
                    console.info(`Opening file ${fileHandle.name}`);
                    const file = await fileHandle.getFile();
                    await openNewBankTab(file);
                }
            });
        }
        if ("electronAPI" in globalThis) {
            const api = (globalThis as unknown as { electronAPI: ElectronAPI })
                .electronAPI;

            api.onFileOpened(async (path: string) => {
                try {
                    await audioEngine.context.resume();
                    console.info(`Attempting to open ${path}`);
                    const response = await fetch(`file://${path}`);
                    const blob = await response.blob();

                    const file = new File(
                        [blob],
                        path.split("/").pop() ?? "soundfont"
                    );

                    await openNewBankTab(file);
                } catch (error) {
                    toast.error(
                        `Failed to open file ${path.split("/").at(-1)}\n` +
                            `${(error as Error).message}\n` +
                            "Are you in development mode?"
                    );
                }
            });
            console.info("Connected to Electron file handlers");
        }
    }, [audioEngine.context, openNewBankTab]);

    const openFile = useCallback(() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ACCEPTED_FORMATS;
        input.click();
        input.onchange = async () => {
            const file: File | undefined = input.files?.[0];
            if (!file) {
                return;
            }
            await openNewBankTab(file);
        };
    }, [openNewBankTab]);

    const closeTabLocal = useCallback(
        (index: number) => {
            if (!tabs[index]) {
                return;
            }
            setTabs((prevTabs) => {
                const tab = prevTabs[index];
                tab.close();
                return prevTabs.filter((_, i) => i !== index);
            });
            if (activeTab === index) {
                setActiveTab(0);
            }
        },
        [activeTab, tabs]
    );

    const closeTab = useCallback(
        (index: number) => {
            if (!tabs[index]) {
                return;
            }
            const tab = tabs[index];
            if (!tab.dirty) {
                closeTabLocal(index);
                return;
            }
            toast.error(
                (tost) => (
                    <div className={"toast_col"}>
                        <span>{t("unsavedChanges")}</span>
                        <div className={"toast_row"}>
                            <span
                                onClick={() => {
                                    toast.dismiss(tost.id);
                                    closeTabLocal(index);
                                }}
                                className={"pretty_outline"}
                            >
                                {t("discard")}
                            </span>
                            <span
                                onClick={() => toast.dismiss(tost.id)}
                                className={"pretty_outline"}
                            >
                                {t("keep")}
                            </span>
                        </div>
                    </div>
                ),
                {
                    duration: Infinity
                }
            );
        },
        [closeTabLocal, t, tabs]
    );

    const showTabList = !settings;
    const showWelcome = tabs.length === 0 && !settings;
    const showSettings = settings;
    const showEditor = !showWelcome && !showSettings && !!currentManager;

    return (
        <div className={`spessafont_main`}>
            <Toaster toastOptions={{ className: "toasts" }} />
            <MenuBar
                bankEditorRef={bankEditorRef}
                showMidiPlayer={tabs.length > 0}
                toggleSettings={toggleSettings}
                openTab={openNewBankTab as () => void}
                closeTab={() => closeTab(activeTab)}
                manager={currentManager}
                toggleKeyboard={() => setShowKeyboard(!showKeyboard)}
            />
            {showTabList && (
                <TabList
                    activeTab={activeTab}
                    closeTab={closeTab}
                    setActiveTab={setActiveTab}
                    tabs={tabs}
                />
            )}

            {showSettings && <Settings setTheme={setTheme} />}

            {currentManager && (
                <BankEditor
                    ref={bankEditorRef}
                    shown={showEditor}
                    destinationOptions={destinationOptions}
                    ccOptions={ccOptions}
                    manager={currentManager}
                    clipboardManager={clipboardManager}
                    setSplits={setSplits}
                />
            )}

            {showWelcome && (
                <Welcome openFile={openFile} openNewBankTab={openNewBankTab} />
            )}

            {showKeyboard && (
                <KeyboardController
                    splits={splits}
                    ccOptions={ccOptions}
                ></KeyboardController>
            )}
        </div>
    );
}

export default App;
