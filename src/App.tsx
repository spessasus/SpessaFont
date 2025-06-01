import { MenuBar } from "./menu_bar/menu_bar.tsx";
import { localeEnglish } from "./locale/locale_en/locale.ts";
import { loadSettings } from "./settings/save_load/load.ts";
import { UNSET_LANGUAGE } from "./settings/save_load/settings_typedef.ts";
import { DEFAULT_LOCALE, getUserLocale } from "./settings/get_user_locale.ts";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import Manager from "./core_backend/manager.ts";
import { GetUserInput } from "./get_user_input.tsx";
import { useRef, useState } from "react";
import { BasicSoundBank } from "spessasynth_core";
import { SoundBankInfo } from "./info_view/sound_bank_info.tsx";

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

    const managerRef = useRef<Manager>(new Manager(context, setBank));
    const manager = managerRef.current;
    return (
        <div className={"spessafont_main"}>
            <MenuBar manager={manager} setIsLoading={setIsLoading}></MenuBar>
            <SoundBankInfo bank={bank} isLoading={isLoading}></SoundBankInfo>
            <GetUserInput manager={manager}></GetUserInput>
        </div>
    );
}

export default App;
