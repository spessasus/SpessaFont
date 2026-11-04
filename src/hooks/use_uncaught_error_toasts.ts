import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useEventListener } from "./use_event_listener.ts";
import { logError } from "../utils/core_utils.ts";

/**
 * Errors thrown in event handlers (a failed action, paste or undo) skip the error boundaries
 * and would only reach the console, so they are shown as toasts.
 */
export function useUncaughtErrorToasts() {
    const { t } = useTranslation();
    const show = (error: unknown) => {
        logError("Uncaught error.", error);
        // The details first, so the summary ends up below them
        toast.error(String(error));
        toast.error(t("errorBoundary.actionFailed"));
    };
    useEventListener(globalThis, "error", (e) => {
        // Error events without an error (like the ResizeObserver loop notice) are harmless
        if (e.error !== undefined && e.error !== null) {
            show(e.error);
        }
    });
    useEventListener(globalThis, "unhandledrejection", (e) => show(e.reason));
}
