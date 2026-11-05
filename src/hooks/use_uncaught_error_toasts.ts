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
        const details = String(error);
        // The newest toast is drawn on top, so the summary goes first to end up below the
        // details. The ids merge an error thrown again and again (a held key) into one pair
        toast.error(t("errorBoundary.actionFailed"), { id: "uncaught-error" });
        toast.error(details, { id: `uncaught-error-${details}` });
    };
    useEventListener(globalThis, "error", (e) => {
        // Error events without an error (like the ResizeObserver loop notice) are harmless
        if (e.error !== undefined && e.error !== null) {
            show(e.error);
        }
    });
    useEventListener(globalThis, "unhandledrejection", (e) => show(e.reason));
}
