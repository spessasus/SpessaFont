import { logError } from "../utils/core_utils.ts";

export async function enterFullscreen() {
    try {
        await document.body.requestFullscreen();
    } catch (error) {
        logError("Failed to enter fullscreen.", error);
    }
}
