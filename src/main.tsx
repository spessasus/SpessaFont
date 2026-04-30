import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./app.tsx";
import { StrictMode } from "react";
import { MIDIProvider } from "./settings/midi_context/midi_provider.tsx";
import { LocaleList } from "./locale/locale_list.ts";
import {
    getSetting,
    UNSET_LANGUAGE
} from "./settings/save_load/settings_typedef.ts";
import {
    DEFAULT_LOCALE,
    getUserLocale
} from "./settings/save_load/get_user_locale.ts";
import i18next from "i18next";
import { loadSettings } from "./settings/save_load/load.ts";
import { initReactI18next } from "react-i18next";
import { AudioEngineProvider } from "./get_user_input/audio_engine_provider.tsx";

// Load settings and get locale
const initialSettings = loadSettings();
const supportedLocales = Object.keys(LocaleList);

let targetLocale = getSetting("lang", initialSettings);
if (targetLocale === UNSET_LANGUAGE) {
    targetLocale = getUserLocale(supportedLocales);
}

// Init i18n (for AudioEngineProvider)
await i18next.use(initReactI18next).init({
    resources: LocaleList,
    lng: targetLocale,
    fallbackLng: DEFAULT_LOCALE
});

createRoot(document.querySelector("#root")!).render(
    <StrictMode>
        <MIDIProvider>
            <AudioEngineProvider settings={initialSettings}>
                <App initialSettings={initialSettings} />
            </AudioEngineProvider>
        </MIDIProvider>
    </StrictMode>
);
