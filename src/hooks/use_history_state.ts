import type { BankStore } from "../core_backend/bank_store.ts";
import { useBankSnapshot } from "./use_bank_snapshot.ts";

/**
 * Whether the bank can undo or redo, and whether it differs from the saved file.
 */
export function useHistoryState(store: BankStore) {
    return useBankSnapshot(store, (s) => s.history);
}
