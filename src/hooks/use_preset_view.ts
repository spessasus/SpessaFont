import type { BankStore } from "../core_backend/bank_store.ts";
import { useBankSnapshot } from "./use_bank_snapshot.ts";

/**
 * The view of one preset, or undefined once it is not in the bank. Re-renders only when that
 * view changes.
 */
export function usePresetView(store: BankStore, id: number) {
    return useBankSnapshot(store, (s) => s.views.presets.get(id));
}
