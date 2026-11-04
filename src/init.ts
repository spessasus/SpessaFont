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
    // The encoder is only loaded for SF3 saves, so it is fetched (and cached) while idle,
    // or SF3 saves would fail offline until one was made online
    const whenIdle = globalThis.requestIdleCallback ?? setTimeout;
    whenIdle(() => {
        void prefetchEncoder();
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
        fallbackLng: DEFAULT_LOCALE,
        // React escapes text itself, escaping here shows names like "Tom's Kit" as entities
        interpolation: { escapeValue: false }
    });
    // The app works without it, so rendering does not wait for it
    void registerServiceWorker();
    return settings;
}
