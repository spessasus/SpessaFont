import { MenuBar } from "./menu_bar/menu_bar.tsx";
import { localeEnglish } from "./locale/locale_en/locale.ts";
import { loadSettings } from "./settings/save_load/load.ts";
import { UNSET_LANGUAGE } from "./settings/save_load/settings_typedef.ts";
import { DEFAULT_LOCALE, getUserLocale } from "./settings/get_user_locale.ts";
import i18next from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import SoundBankManager from "./core_backend/sound_bank_manager.ts";
import { GetUserInput } from "./get_user_input/get_user_input.tsx";
import { useEffect, useState } from "react";
import { AudioEngine } from "./core_backend/audio_engine.ts";
import { ClipBoardManager } from "./core_backend/clipboard_manager.ts";
import { Settings } from "./settings/settings.tsx";
import { TabList } from "./tab_list/tab_list.tsx";
import { BankEditor } from "./bank_editor/bank_editor.tsx";
import { type BasicSoundBank, loadSoundFont } from "spessasynth_core";

const localeList = {
    en: { translation: localeEnglish }
};

// apply locale
let targetLocale = loadSettings().lang;
if (targetLocale === UNSET_LANGUAGE) {
    targetLocale = getUserLocale();
}

i18next
    .use(initReactI18next)
    .init({
        resources: localeList,
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

// shared clipboard
const clipboardManager = new ClipBoardManager();

function App() {
    const [tabs, setTabs] = useState<SoundBankManager[]>([]);
    const [activeTab, setActiveTab] = useState<number>(0); // index in tabs[]
    const { t } = useTranslation();
    const currentManager = tabs[activeTab];
    const [isLoading, setIsLoading] = useState(false);
    const [settings, setSettings] = useState(false);

    useEffect(() => {
        if (tabs.length > 0 && tabs[activeTab]) {
            tabs[activeTab].sendBankToSynth();
        }
    }, [activeTab, tabs]);

    const toggleSettings = () => setSettings(!settings);

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
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
        setTabs((prev) =>
            prev.filter((t, i) => {
                if (i === index) {
                    t.close();
                    return false;
                }
                return true;
            })
        );
        setActiveTab(0);
    }

    const showTabList = !settings;
    const showEditor = !settings && !isLoading && tabs.length > 0;
    const showWelcome = tabs.length < 1;

    return (
        <div className="spessafont_main">
            <MenuBar
                toggleSettings={toggleSettings}
                audioEngine={audioEngine}
                openTab={openNewBankTab}
                closeTab={() => closeTab(activeTab)}
                manager={currentManager}
            />
            {showTabList && (
                <TabList
                    activeTab={activeTab}
                    closeTab={closeTab}
                    setActiveTab={setActiveTab}
                    tabs={tabs}
                />
            )}

            {settings && <Settings engine={audioEngine} />}

            {isLoading && (
                <div className="welcome">
                    <h1>{t("synthInit.genericLoading")}</h1>
                </div>
            )}

            {showEditor && (
                <BankEditor
                    manager={tabs[activeTab]}
                    audioEngine={audioEngine}
                    clipboardManager={clipboardManager}
                />
            )}

            {showWelcome && (
                <div className="welcome">
                    <h1>{t("welcome.main")}</h1>
                    <h2>{t("welcome.prompt")}</h2>
                    <h3>{t("welcome.copyright")}</h3>
                </div>
            )}

            <GetUserInput audioEngine={audioEngine} />
        </div>
    );
}

export default App;
