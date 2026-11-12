import { flushSync } from "react-dom";
import { logError } from "./core_utils.ts";

/**
 * Runs a state change inside a view transition, so the elements its CSS names (the phone's
 * editor) cross-fade from the old state to the new one. Where the browser has no view
 * transitions, or the user asked for less motion, the change runs at once.
 * The change itself runs a frame later, once the browser has taken the old picture.
 */
export function runViewTransition(update: () => void) {
    if (
        typeof document === "undefined" ||
        !("startViewTransition" in document) ||
        matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
        update();
        return;
    }
    const transition = document.startViewTransition(() => {
        flushSync(update);
    });
    void reportFailure(transition.ready);
}

/**
 * Logs a transition that failed. One that was skipped is fine, the change still happened:
 * another transition started (AbortError) or the page was hidden (InvalidStateError).
 */
async function reportFailure(ready: Promise<void>) {
    try {
        await ready;
    } catch (error) {
        if (
            error instanceof DOMException &&
            (error.name === "AbortError" || error.name === "InvalidStateError")
        ) {
            return;
        }
        logError("The view transition failed.", error);
    }
}
