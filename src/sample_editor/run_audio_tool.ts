import toast from "react-hot-toast";
import { logError } from "../utils/core_utils.ts";

/**
 * Runs an audio tool, which reads the audio first, and reports a failed read.
 */
export async function runAudioTool(task: () => Promise<void>) {
    try {
        await task();
    } catch (error) {
        logError("Failed to process the sample audio.", error);
        toast.error(String(error));
    }
}
