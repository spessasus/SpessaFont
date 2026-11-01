import type { BasicSoundBank } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { BankSession } from "../core_backend/bank_session.ts";
import { loadSoundBank } from "../core_backend/load_sound_bank.ts";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import { IS_CHROME, IS_ELECTRON } from "../utils/environment_detection.ts";
import { yieldToPaint } from "../utils/yield_to_paint.ts";
import { logError } from "../utils/core_utils.ts";

/**
 * Chromium throws NotReadableError when reading files larger than this.
 */
const CHROMIUM_FILE_LIMIT = 2_147_483_648;

/**
 * Returns a function that loads a bank file (or creates an empty bank without one)
 * with progress and error toasts, and passes the new session to `onOpened`.
 */
export function useBankFileOpener(onOpened: (session: BankSession) => void) {
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();

    return async (file?: File) => {
        const id = toast.loading(t("loadingAndSaving.loadingFileFromDisk"));
        let bank: BasicSoundBank | undefined = undefined;
        if (file) {
            if (IS_CHROME && !IS_ELECTRON && file.size > CHROMIUM_FILE_LIMIT) {
                toast.error(t("loadingAndSaving.chromeError"), { id });
                return;
            }
            try {
                const buffer = await file.arrayBuffer();
                toast.loading(t("loadingAndSaving.parsingSoundBank"), { id });
                // Parsing blocks the main thread, so let the toast show first
                await yieldToPaint();
                bank = loadSoundBank(buffer);
            } catch (error) {
                logError("Failed to load the sound bank.", error);
                toast.dismiss(id);
                if (
                    error instanceof DOMException &&
                    error.name === "NotReadableError"
                ) {
                    // Electron fails like this on files it cannot access
                    toast.error(t("loadingAndSaving.electronError"));
                } else {
                    // The details first, so the summary ends up below them
                    toast.error(String(error));
                    toast.error(t("loadingAndSaving.errorLoadingSoundBank"));
                }
                return;
            }
        }
        onOpened(
            new BankSession(audioEngine.processor, audioEngine.sequencer, bank)
        );
        toast.dismiss(id);
    };
}
