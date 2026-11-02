import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { LocaleList } from "./locale/locale_list.ts";
import { loadSettings } from "./settings/save_load/load.ts";
import {
    DEFAULT_LOCALE,
    resolveLocale
} from "./settings/save_load/get_user_locale.ts";
import { applyTheme } from "./settings/apply_theme.ts";
import { IS_ELECTRON } from "./utils/environment_detection.ts";
import { logError, logInfo } from "./utils/core_utils.ts";

async function registerServiceWorker() {
    // Service workers are unsafe on Electron
    if (IS_ELECTRON || !("serviceWorker" in navigator)) {
        return;
    }
    try {
        await navigator.serviceWorker.register("service-worker.js");
        logInfo("Registered service worker");
    } catch (error) {
        logError("Failed to register the service worker.", error);
        return;
    }
    // The service worker only caches what was fetched, so get the encoder while idle,
    // or SF3 saves would fail offline until one was made online
    requestIdleCallback(() => {
        void prefetchEncoder();
    });
}

async function prefetchEncoder() {
    try {
        const { prefetchVorbisEncoder } =
            await import("./core_backend/encode_vorbis.ts");
        await prefetchVorbisEncoder();
    } catch (error) {
        logError("Failed to prefetch the Vorbis encoder.", error);
    }
}

/**
 * Prepares everything the first render needs: settings, theme, and translations.
 * Returns the loaded settings.
 */
export async function init() {
    const settings = loadSettings();
    applyTheme(settings.theme);
    await i18next.use(initReactI18next).init({
        resources: LocaleList,
        lng: resolveLocale(settings.lang),
        fallbackLng: DEFAULT_LOCALE
    });
    // The app works without it, so rendering does not wait for it
    void registerServiceWorker();
    return settings;
}
