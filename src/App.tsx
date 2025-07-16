import { MenuBar } from "./menu_bar/menu_bar.tsx";
import { loadSettings } from "./settings/save_load/load.ts";
import {
    applyAudioSettings,
    getSetting,
    UNSET_LANGUAGE
} from "./settings/save_load/settings_typedef.ts";
import {
    DEFAULT_LOCALE,
    getUserLocale
} from "./settings/save_load/get_user_locale.ts";
import i18next from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import SoundBankManager from "./core_backend/sound_bank_manager.ts";
import { GetUserInput } from "./get_user_input/get_user_input.tsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioEngine } from "./core_backend/audio_engine.ts";
import { ClipboardManager } from "./core_backend/clipboard_manager.ts";
import { Settings } from "./settings/settings.tsx";
import { TabList } from "./tab_list/tab_list.tsx";
import { LocaleList } from "./locale/locale_list.ts";
import { KeyboardController } from "./keyboard/keyboard_controller.tsx";
import { DestinationsOptions } from "./utils/translated_options/destination_options.tsx";
import { ModulableControllerOptions } from "./utils/translated_options/modulable_controller_options.tsx";
import {
    type BankEditorRef,
    MemoizedBankEditor
} from "./bank_editor/bank_editor.tsx";
import { ACCEPTED_FORMATS } from "./utils/accepted_formats.ts";
import { loadSoundBank } from "./core_backend/load_sound_bank.ts";
import type { BasicSoundBank, SoundFontRange } from "spessasynth_core";
import toast, { Toaster } from "react-hot-toast";
import "./toasts.css";
import { Welcome } from "./welcome/welcome.tsx";

// apply locale
const initialSettings = loadSettings();
let targetLocale = getSetting("lang", initialSettings);
if (targetLocale === UNSET_LANGUAGE) {
    targetLocale = getUserLocale();
}

i18next
    .use(initReactI18next)
    .init({
        resources: LocaleList,
        lng: targetLocale,
        fallbackLng: DEFAULT_LOCALE
    })
    .then();

const context = new AudioContext({
    sampleRate: 48000,
    latencyHint: "interactive"
});

// shared audio engine, the bank will swap on switching tabs
const audioEngine = new AudioEngine(context);

applyAudioSettings(initialSettings, audioEngine);

// shared clipboard
const clipboardManager = new ClipboardManager();

function App() {
    const { t } = useTranslation();
    const [tabs, setTabs] = useState<SoundBankManager[]>([]);
    const [showKeyboard, setShowKeyboard] = useState(false);
    const [settings, setSettings] = useState(false);
    const [theme, setTheme] = useState(getSetting("theme", initialSettings));
    const [activeTab, setActiveTab] = useState<number>(0); // index in tabs[]
    const bankEditorRef: BankEditorRef = useRef(null);
    const [splits, setSplits] = useState<SoundFontRange[]>([]);

    const currentManager: SoundBankManager | undefined = useMemo(
        () => tabs[activeTab],
        [activeTab, tabs]
    );

    // cached translated options
    // note: i can't use JSX here as it calls MCO 9 times for some reason?
    const ccOptions = useMemo(
        () => ModulableControllerOptions({ t: t, padLength: 5 }),
        [t]
    );
    const destinationOptions = useMemo(
        () => <>{DestinationsOptions({ t: t })}</>,
        [t]
    );

    useEffect(() => {
        if (tabs.length > 0 && tabs[activeTab]) {
            tabs[activeTab].sendBankToSynth();
        } else {
            audioEngine.pauseMIDI();
        }
    }, [activeTab, tabs]);

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
                // @ts-expect-error chrome property
                if (bankFile.size > 2_147_483_648 && window["chrome"]) {
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
                } catch (e) {
                    console.error(e);
                    toast.dismiss(id);
                    // make so the error appears at the bottom
                    toast.error(`${e}`);
                    toast.error(t("loadingAndSaving.errorLoadingSoundBank"));
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
        [t]
    );

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
    const showWelcome = tabs.length < 1 && !settings;
    const showSettings = settings;
    const showEditor = !showWelcome && !showSettings && !!currentManager;

    return (
        <div
            className={`spessafont_main ${theme === "light" ? "light_mode" : ""}`}
        >
            <Toaster toastOptions={{ className: "toasts" }} />
            <MenuBar
                bankEditorRef={bankEditorRef}
                showMidiPlayer={tabs.length > 0}
                toggleSettings={toggleSettings}
                audioEngine={audioEngine}
                openTab={openNewBankTab}
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

            {showSettings && (
                <Settings setTheme={setTheme} engine={audioEngine} />
            )}

            {currentManager && (
                <MemoizedBankEditor
                    ref={bankEditorRef}
                    shown={showEditor}
                    destinationOptions={destinationOptions}
                    ccOptions={ccOptions}
                    manager={currentManager}
                    audioEngine={audioEngine}
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
                    engine={audioEngine}
                ></KeyboardController>
            )}

            <GetUserInput audioEngine={audioEngine} />
        </div>
    );
}

export default App;
