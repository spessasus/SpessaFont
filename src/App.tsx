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
import { useEffect, useMemo, useState } from "react";
import { AudioEngine } from "./core_backend/audio_engine.ts";
import { ClipBoardManager } from "./core_backend/clipboard_manager.ts";
import { Settings } from "./settings/settings.tsx";
import { TabList } from "./tab_list/tab_list.tsx";
import { type BasicSoundBank, loadSoundFont } from "spessasynth_core";
import { LocaleList } from "./locale/locale_list.ts";
import { KeyboardController } from "./keyboard/keyboard_controller.tsx";
import { DestinationsOptions } from "./utils/translated_options/destination_options.tsx";
import { ModulableControllerOptions } from "./utils/translated_options/modulable_controller_options.tsx";
import { MemoizedBankEditor } from "./bank_editor/bank_editor.tsx";

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
const clipboardManager = new ClipBoardManager();

function App() {
    const { t } = useTranslation();
    const [tabs, setTabs] = useState<SoundBankManager[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showKeyboard, setShowKeyboard] = useState(false);
    const [settings, setSettings] = useState(false);
    const [theme, setTheme] = useState(getSetting("theme", initialSettings));
    const [activeTab, setActiveTab] = useState<number>(0); // index in tabs[]

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
        () => DestinationsOptions({ t: t }),
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
        function handleKeyDown(e: KeyboardEvent) {
            if (!currentManager) {
                return;
            }
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case "z":
                        currentManager.undo();
                        break;
                    case "y":
                        currentManager.redo();
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
    }, [currentManager]);

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

    async function openNewBankTab(bankFile?: File) {
        setIsLoading(true);

        let bank: BasicSoundBank | undefined = undefined;
        if (bankFile) {
            const buf = await bankFile.arrayBuffer();
            bank = loadSoundFont(buf);
        }

        // will automatically create an empty bank if not provided
        const newManager = new SoundBankManager(
            audioEngine.processor,
            audioEngine.sequencer,
            bank
        );
        setIsLoading(false);
        newManager.sendBankToSynth();
        setTabs((prev) => [newManager, ...prev]);
        setActiveTab(0); // newly added tab
    }

    function closeTab(index: number) {
        setTabs((prevTabs) => {
            const tab = prevTabs[index];
            if (tab.dirty) {
                const confirmed = window.confirm(t("unsavedChanges"));
                if (!confirmed) {
                    return prevTabs;
                }
            }
            tab.close();
            return prevTabs.filter((_, i) => i !== index);
        });
        setActiveTab(0);
    }

    const showTabList = !settings;
    const showEditor = useMemo(
        () => !settings && !isLoading && tabs.length > 0,
        [isLoading, settings, tabs.length]
    );
    const showWelcome = tabs.length < 1 && !settings && !isLoading;
    const showSettings = settings && !isLoading;
    return (
        <div
            className={`spessafont_main ${theme === "light" ? "light_mode" : ""}`}
        >
            <MenuBar
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

            {isLoading && (
                <div className="welcome">
                    <h1>{t("synthInit.genericLoading")}</h1>
                </div>
            )}

            <MemoizedBankEditor
                destinationOptions={destinationOptions}
                ccOptions={ccOptions}
                manager={currentManager}
                audioEngine={audioEngine}
                clipboardManager={clipboardManager}
                show={showEditor}
            />

            {showWelcome && (
                <div className="welcome">
                    <h1>{t("welcome.main")}</h1>
                    <h2>{t("welcome.prompt")}</h2>
                    <h3>{t("welcome.copyright")}</h3>
                </div>
            )}

            {showKeyboard && (
                <KeyboardController
                    ccOptions={ccOptions}
                    engine={audioEngine}
                ></KeyboardController>
            )}

            <GetUserInput audioEngine={audioEngine} />
        </div>
    );
}

export default App;
