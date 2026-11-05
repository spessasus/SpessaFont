import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { BankSession } from "../core_backend/bank_session.ts";
import {
    type LoadedBank,
    loadSoundBank
} from "../core_backend/load_sound_bank.ts";
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
 * with progress and error toasts, and passes the new session to `onOpened`. It resolves to
 * the new session, or undefined when the file could not be loaded.
 */
export function useBankFileOpener(onOpened: (session: BankSession) => void) {
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();

    const showLoadError = (error: unknown) => {
        // The details first, so the summary ends up below them
        toast.error(String(error));
        toast.error(t("loadingAndSaving.errorLoadingSoundBank"));
    };

    return async (file?: File) => {
        const id = toast.loading(
            t(
                file
                    ? "loadingAndSaving.loadingFileFromDisk"
                    : "loadingAndSaving.creatingNewBank"
            )
        );
        if (
            file &&
            IS_CHROME &&
            !IS_ELECTRON &&
            file.size > CHROMIUM_FILE_LIMIT
        ) {
            toast.error(t("loadingAndSaving.chromeError"), { id });
            return undefined;
        }
        let session: BankSession;
        try {
            let loaded: LoadedBank | undefined;
            if (file) {
                const buffer = await file.arrayBuffer();
                toast.loading(t("loadingAndSaving.parsingSoundBank"), { id });
                // Parsing blocks the main thread, so let the toast show first
                await yieldToPaint();
                loaded = loadSoundBank(buffer);
            }
            session = new BankSession(audioEngine.client, loaded);
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
                showLoadError(error);
            }
            return undefined;
        }
        try {
            // The synthesizer loads the bank too, a bank it cannot play or save is not opened
            await session.opened;
        } catch (error) {
            logError("The synthesizer failed to load the sound bank.", error);
            session.close();
            toast.dismiss(id);
            showLoadError(error);
            return undefined;
        }
        onOpened(session);
        toast.dismiss(id);
        const count = session.undecodableSampleCount;
        if (count > 0) {
            toast.error(t("loadingAndSaving.undecodableSamples", { count }));
        }
        return session;
    };
}
