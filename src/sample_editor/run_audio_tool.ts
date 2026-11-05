import toast from "react-hot-toast";
import i18next from "i18next";
import { logError } from "../utils/core_utils.ts";

/**
 * Runs an audio tool, which reads the audio first, and reports a failed read.
 */
export async function runAudioTool(task: () => Promise<void>) {
    try {
        await task();
    } catch (error) {
        logError("Failed to process the sample audio.", error);
        // The details first, so the summary ends up below them
        toast.error(String(error));
        toast.error(i18next.t("sampleLocale.tools.failed"));
    }
}
