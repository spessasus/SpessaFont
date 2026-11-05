import { useSyncExternalStore } from "react";
import type { BankSnapshot, BankStore } from "../core_backend/bank_store.ts";

/**
 * Reads one part of the bank snapshot and re-renders only when that part changes.
 * The selector must return a field of the snapshot (or another value with a stable identity).
 */
export function useBankSnapshot<T>(
    store: BankStore,
    select: (snapshot: BankSnapshot) => T
) {
    return useSyncExternalStore(store.subscribe, () =>
        select(store.getSnapshot())
    );
}
