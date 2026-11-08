import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { LocaleList } from "./locale/locale_list.ts";
import { loadSettings } from "./settings/save_load/load.ts";
import {
    DEFAULT_LOCALE,
    resolveLocale
} from "./settings/save_load/get_user_locale.ts";
import { applyTheme } from "./settings/apply_theme.ts";
import { applyLayout } from "./layout/apply_layout.ts";
import { PHONE_LAYOUT_QUERY, resolveLayout } from "./layout/layout_setting.ts";
import { IS_ELECTRON } from "./utils/environment_detection.ts";
import { logError, logInfo } from "./utils/core_utils.ts";
import { syncElectronUnloadPrompt } from "./utils/electron_unload_prompt.ts";

async function registerServiceWorker() {
    // Service workers are unsafe on Electron
    if (IS_ELECTRON || !("serviceWorker" in navigator)) {
        return;
    }
    // A worker on the dev server would cache every module and answer with old ones
    if (import.meta.env.DEV) {
        try {
            const registrations =
                await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map((r) => r.unregister()));
        } catch (error) {
            logError("Failed to remove the service worker.", error);
        }
        return;
    }
    try {
        // The version in the URL makes every release install its own worker and cache
        await navigator.serviceWorker.register(
            `service-worker.js?version=${encodeURIComponent(__APP_VERSION__)}`
        );
        logInfo("Registered service worker");
    } catch (error) {
        logError("Failed to register the service worker.", error);
        return;
    }
    const worker = await getControllingWorker();
    // On the first visit the page loaded before the worker could cache anything
    worker.postMessage({
        type: "cache",
        urls: performance
            .getEntriesByType("resource")
            .map((entry) => entry.name)
    });
}

/**
 * The worker that controls this page, waiting for it to take over on the first visit.
 */
async function getControllingWorker() {
    const { serviceWorker } = navigator;
    if (serviceWorker.controller) {
        return serviceWorker.controller;
    }
    await new Promise<void>((resolve) => {
        serviceWorker.addEventListener("controllerchange", () => resolve(), {
            once: true
        });
    });
    const { controller } = serviceWorker;
    if (!controller) {
        throw new Error("The service worker did not take control of the page.");
    }
    return controller;
}

/**
 * Prepares everything the first render needs: settings, theme, and translations.
 * Returns the loaded settings.
 */
export async function init() {
    const settings = loadSettings();
    applyTheme(settings.theme);
    applyLayout(
        resolveLayout(settings.layout, matchMedia(PHONE_LAYOUT_QUERY).matches)
    );
    // Screen readers, translation offers and CJK glyphs follow the page's language
    i18next.on("languageChanged", (locale) => {
        document.documentElement.lang = locale;
    });
    await i18next.use(initReactI18next).init({
        resources: LocaleList,
        lng: resolveLocale(settings.lang),
        fallbackLng: DEFAULT_LOCALE,
        // React escapes text itself, escaping here shows names like "Tom's Kit" as entities
        interpolation: { escapeValue: false }
    });
    syncElectronUnloadPrompt();
    // The app works without it, so rendering does not wait for it
    void registerServiceWorker();
    return settings;
}
