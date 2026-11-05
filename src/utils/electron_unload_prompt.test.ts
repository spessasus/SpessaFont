import { describe, expect, it, vi } from "vitest";
import i18next from "i18next";
import { LocaleList } from "../locale/locale_list.ts";
import type { UnloadPromptTexts } from "../types/electron.ts";
import { syncElectronUnloadPrompt } from "./electron_unload_prompt.ts";

function unsubscribe() {
    // Nothing to remove in this test
}

describe("syncElectronUnloadPrompt", () => {
    it("sends the texts now and again when the language changes", async () => {
        await i18next.init({ resources: LocaleList, lng: "en" });
        const sent = new Array<UnloadPromptTexts>();
        vi.stubGlobal("electronAPI", {
            onFileOpened: () => unsubscribe,
            appReady: () => undefined,
            setUnloadPromptTexts: (texts: UnloadPromptTexts) => {
                sent.push(texts);
            }
        });
        syncElectronUnloadPrompt();
        await i18next.changeLanguage("pl");
        expect(sent).toEqual([
            {
                title: "Unsaved changes",
                message: "Some sound banks have unsaved changes. Discard them?",
                discard: "Discard",
                keep: "Keep"
            },
            {
                title: "Niezapisane zmiany",
                message:
                    "Niektóre banki dźwięków mają niezapisane zmiany. Odrzucić je?",
                discard: "Odrzuć",
                keep: "Zachowaj"
            }
        ]);
    });
});
