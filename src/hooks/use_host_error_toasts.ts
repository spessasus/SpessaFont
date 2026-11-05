import { useEffect } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { AudioEngine } from "../core_backend/audio_engine.ts";
import { logError } from "../utils/core_utils.ts";

/**
 * One toast for all of them, so edits that keep failing do not stack toasts.
 */
const HOST_ERROR_TOAST = "host_error";

/**
 * Shows the failures of the synthesizer host, which runs apart from the page and would
 * otherwise only log them in its own console.
 */
export function useHostErrorToasts(audioEngine: AudioEngine) {
    const { t } = useTranslation();
    useEffect(
        () =>
            audioEngine.client.hostErrors.subscribe((message) => {
                logError("The synthesizer failed.", message);
                toast.error(
                    t("settingsLocale.audioEngine.hostFailed", { message }),
                    { id: HOST_ERROR_TOAST }
                );
            }),
        [audioEngine, t]
    );
}
