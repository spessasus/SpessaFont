import i18next from "i18next";

/**
 * Keeps the desktop app's "unsaved changes" question in the app's language. The main process
 * asks it when closing or reloading the window would lose unsaved banks.
 */
export function syncElectronUnloadPrompt() {
    const api = globalThis.electronAPI;
    if (!api) {
        return;
    }
    const sendTexts = () => {
        api.setUnloadPromptTexts({
            title: i18next.t("unsavedBanksTitle"),
            message: i18next.t("unsavedBanksMessage"),
            discard: i18next.t("discard"),
            keep: i18next.t("keep")
        });
    };
    sendTexts();
    i18next.on("languageChanged", sendTexts);
}
