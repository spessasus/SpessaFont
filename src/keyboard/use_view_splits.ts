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
 * The key ranges to highlight for the shown element, from the bank's views.
 */
export function useViewSplits(
    session: BankSession | undefined,
    view: BankEditView
) {
    const views = useSyncExternalStore(
        session?.store.subscribe ?? subscribeToNothing,
        () => session?.store.getSnapshot().views
    );
    return views ? getViewSplits(view, views) : [];
}
