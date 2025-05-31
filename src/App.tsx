import { MenuBar } from "./menu_bar/menu_bar.tsx";
import { localeEnglish } from "./locale/locale_en/locale.ts";
import { loadSettings } from "./settings/save_load/load.ts";
import { UNSET_LANGUAGE } from "./settings/save_load/settings_typedef.ts";
import { DEFAULT_LOCALE, getUserLocale } from "./settings/get_user_locale.ts";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { MainPageHeader } from "./head.tsx";
import { HelmetProvider } from "@dr.pogodin/react-helmet";

function App() {
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
    return (
        <HelmetProvider>
            <div className={"spessafont_main"}>
                <MainPageHeader></MainPageHeader>
                <MenuBar></MenuBar>
            </div>
        </HelmetProvider>
    );
}

export default App;
