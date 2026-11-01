import { MenuBar } from "./menu_bar/menu_bar.tsx";
import {
    getSetting,
    type SavedSettingsType
} from "./settings/save_load/settings_typedef.ts";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardManager } from "./core_backend/clipboard_manager.ts";
import { Settings } from "./settings/settings.tsx";
import { TabList } from "./tab_list/tab_list.tsx";
import { KeyboardController } from "./keyboard/keyboard_controller.tsx";
import { DestinationsOptions } from "./utils/translated_options/destination_options.tsx";
import { ModulableControllerOptions } from "./utils/translated_options/modulable_controller_options.tsx";
import { BankEditor } from "./bank_editor/bank_editor.tsx";
import { BankSession } from "./core_backend/bank_session.ts";
import type { BankEditView } from "./core_backend/bank_view.ts";
import { ACCEPTED_SOUNDBANK_FORMATS } from "./utils/accepted_formats.ts";
import { loadSoundBank } from "./core_backend/load_sound_bank.ts";
import type { BasicSoundBank, GenericRange } from "spessasynth_core";
import toast, { Toaster } from "react-hot-toast";
import "./toasts.css";
import { Welcome } from "./welcome/welcome.tsx";
import type { ElectronAPI } from "./types/electron.ts";
import { IS_CHROME, IS_ELECTRON } from "./utils/environment_detection.ts";
import { logInfo, logError } from "./utils/core_utils.ts";
import { useAudioEngine } from "./core_backend/audio_engine_context.ts"; // apply locale
import { useMIDIAccess } from "./settings/midi_context/midi_context.ts"; // for MIDI listener

// shared clipboard
const clipboardManager = new ClipboardManager();

// Service workers are unsafe on electron
if (!IS_ELECTRON && navigator.serviceWorker) {
    await navigator.serviceWorker.register("service-worker.js");
    logInfo("Registered service worker");
}

function App({ initialSettings }: { initialSettings: SavedSettingsType }) {
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();
    const [tabs, setTabs] = useState<BankSession[]>([]);
    // The selected element of each tab, by session id
    const [views, setViews] = useState<ReadonlyMap<number, BankEditView>>(
        () => new Map()
    );
    const [showKeyboard, setShowKeyboard] = useState(false);
    const [settings, setSettings] = useState(false);
    const [theme, setTheme] = useState(getSetting("theme", initialSettings));
    const [activeTab, setActiveTab] = useState<number>(0); // index in tabs[]
    const [splits, setSplits] = useState<GenericRange[]>([]);

    const currentSession: BankSession | undefined = tabs[activeTab];
    const currentView = currentSession
        ? (views.get(currentSession.id) ?? "info")
        : "info";

    const setCurrentView = useCallback(
        (view: BankEditView) => {
            if (!currentSession) {
                return;
            }
            setViews((prev) => new Map(prev).set(currentSession.id, view));
        },
        [currentSession]
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

    // Play the active tab's bank, pause MIDI when no tab is open
    useEffect(() => {
        if (currentSession) currentSession.synth.attach();
        else audioEngine.pauseMIDI();
    }, [audioEngine, currentSession]);

    const toggleSettings = () => setSettings(!settings);

    useEffect(() => {
        function handleUnload(e: BeforeUnloadEvent) {
            if (tabs.some((t) => t.history.isDirty)) {
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
                    IS_CHROME &&
                    !IS_ELECTRON &&
                    bankFile.size > 2_147_483_648
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
                    logError("Failed to load the sound bank.", error);
                    toast.dismiss(id);
                    if ((error as Error).name === "NotReadableError") {
                        // special Electron error
                        toast.error(t("loadingAndSaving.electronError"));
                    } else {
                        // make so the error appears at the bottom
                        toast.error(String(error));
                        toast.error(
                            t("loadingAndSaving.errorLoadingSoundBank")
                        );
                    }
                    return;
                }
            }

            // will automatically create an empty bank if not provided
            const newSession = new BankSession(
                audioEngine.processor,
                audioEngine.sequencer,
                bank
            );
            toast.dismiss(id);
            setTabs((prev) => [newSession, ...prev]);
            setActiveTab(0); // newly added tab
        },
        [audioEngine.processor, audioEngine.sequencer, t]
    );

    // Electron ready signal
    useEffect(() => {
        if (!(IS_ELECTRON && "electronAPI" in globalThis)) {
            return;
        }

        const api = (globalThis as unknown as { electronAPI: ElectronAPI })
            .electronAPI;
        api.appReady();
    }, []);

    // Loading files with electron or launch queue
    useEffect(() => {
        if (typeof launchQueue !== "undefined") {
            launchQueue.setConsumer(async (launchParams) => {
                await audioEngine.context.resume();
                for (const fileHandle of launchParams.files) {
                    logInfo(`Opening file ${fileHandle.name}`);
                    const file = await fileHandle.getFile();
                    await openNewBankTab(file);
                }
            });
        }
        if (!("electronAPI" in globalThis)) {
            return;
        }
        const api = (globalThis as unknown as { electronAPI: ElectronAPI })
            .electronAPI;

        api.onFileOpened(async (path: string) => {
            try {
                await audioEngine.context.resume();
                logInfo(`Attempting to open ${path}`);
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
        logInfo("Connected to Electron file handlers");
    }, [audioEngine.context, openNewBankTab]);

    const { selectedDevice } = useMIDIAccess();
    useEffect(() => {
        if (!selectedDevice) return;

        const handler = (e: MIDIMessageEvent) => {
            if (e.data) {
                audioEngine.processRealTime(e.data);
            }
        };

        selectedDevice.addEventListener("midimessage", handler);
        return () => {
            selectedDevice.removeEventListener("midimessage", handler);
        };
    }, [audioEngine, selectedDevice]);

    const openFile = useCallback(() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ACCEPTED_SOUNDBANK_FORMATS;
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
            if (index >= tabs.length) {
                return;
            }
            const tab = tabs[index];
            tab.close();
            setTabs((prevTabs) => prevTabs.filter((t) => t !== tab));
            setViews((prev) => {
                const next = new Map(prev);
                next.delete(tab.id);
                return next;
            });
            if (activeTab === index) {
                setActiveTab(0);
            }
        },
        [activeTab, tabs]
    );

    const closeTab = useCallback(
        (index: number) => {
            if (index >= tabs.length) {
                return;
            }
            const tab = tabs[index];
            if (!tab.history.isDirty) {
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

    const isTabListShown = !settings;
    const isWelcomeShown = tabs.length === 0 && !settings;
    const areSettingsShown = settings;
    const isEditorShown =
        !isWelcomeShown && !areSettingsShown && !!currentSession;

    return (
        <div className={`spessafont_main`}>
            <Toaster toastOptions={{ className: "toasts" }} />
            <MenuBar
                showMidiPlayer={tabs.length > 0}
                toggleSettings={toggleSettings}
                openTab={openNewBankTab}
                closeTab={() => closeTab(activeTab)}
                session={currentSession}
                setView={setCurrentView}
                toggleKeyboard={() => setShowKeyboard(!showKeyboard)}
            />
            {isTabListShown && (
                <TabList
                    activeTab={activeTab}
                    closeTab={closeTab}
                    setActiveTab={setActiveTab}
                    tabs={tabs}
                />
            )}

            {areSettingsShown && <Settings setTheme={setTheme} />}

            {currentSession && (
                <BankEditor
                    key={currentSession.id}
                    session={currentSession}
                    view={currentView}
                    setView={setCurrentView}
                    shown={isEditorShown}
                    destinationOptions={destinationOptions}
                    ccOptions={ccOptions}
                    clipboardManager={clipboardManager}
                    setSplits={setSplits}
                />
            )}

            {isWelcomeShown && (
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
