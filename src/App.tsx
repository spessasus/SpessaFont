import { MenuBar } from "./menu_bar/menu_bar.tsx";
import { localeEnglish } from "./locale/locale_en/locale.ts";
import { loadSettings } from "./settings/save_load/load.ts";
import { UNSET_LANGUAGE } from "./settings/save_load/settings_typedef.ts";
import { DEFAULT_LOCALE, getUserLocale } from "./settings/get_user_locale.ts";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import Manager from "./core_backend/manager.ts";
import { GetUserInput } from "./get_user_input.tsx";
import { useEffect, useRef, useState } from "react";
import { BasicSoundBank } from "spessasynth_core";
import { SoundBankInfo } from "./info_view/sound_bank_info.tsx";
import { PresetList } from "./preset_list/preset_list.tsx";
import { MainContentStates } from "./main_content_states.ts";

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

function App() {
    const [bank, setBank] = useState<BasicSoundBank>();
    const [isLoading, setIsLoading] = useState(false);
    const [contentState, setContentState] = useState(MainContentStates.stats);

    const managerRef = useRef<Manager>(new Manager(context, setBank));
    const manager = managerRef.current;

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case "z":
                        manager.undoBankModification();
                        break;
                    case "y":
                        manager.redoBankModification();
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
    }, [manager]);

    function MainContent() {
        switch (contentState) {
            default:
                return <div>ERROR</div>;

            case MainContentStates.stats:
                return (
                    <SoundBankInfo
                        manager={manager}
                        isLoading={isLoading}
                    ></SoundBankInfo>
                );
        }
    }

    return (
        <div className={"spessafont_main"}>
            <MenuBar
                setContentState={setContentState}
                contentState={contentState}
                manager={manager}
                setIsLoading={setIsLoading}
            ></MenuBar>
            <div className={"main_content"}>
                <PresetList bank={bank}></PresetList>
                <div className={"main_content_window"}>
                    <MainContent></MainContent>
                </div>
            </div>
            <GetUserInput manager={manager}></GetUserInput>
        </div>
    );
}

export default App;
