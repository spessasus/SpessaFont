import type { BankStore } from "../core_backend/bank_store.ts";
import { useBankSnapshot } from "./use_bank_snapshot.ts";

/**
 * Finds the core object of an element by its view id, for the identity a handler or the
 * selection needs (never to read its data in render, that comes from the views). The store
 * builds it once per element list, so every row shares it, and it follows the lists' changes.
 */
export function useEntityLookup(store: BankStore) {
    return useBankSnapshot(store, (s) => s.lookup);
}
