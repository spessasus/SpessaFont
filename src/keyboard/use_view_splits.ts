import { useSyncExternalStore } from "react";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { getViewSplits } from "../utils/zone_splits.ts";

function unsubscribeNothing() {
    // There is nothing to unsubscribe from without a session
}

function subscribeToNothing() {
    return unsubscribeNothing;
}

/**
 * The key ranges to highlight for the shown element, updated with every bank change.
 */
export function useViewSplits(
    session: BankSession | undefined,
    view: BankEditView
) {
    // The bank revision changes with every edit, so the splits are recomputed
    useSyncExternalStore(
        session?.store.subscribe ?? subscribeToNothing,
        () => session?.store.getSnapshot().revision ?? 0
    );
    return session && view !== "info" && session.document.contains(view)
        ? getViewSplits(view)
        : [];
}
