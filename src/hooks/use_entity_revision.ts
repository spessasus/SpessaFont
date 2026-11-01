import { useSyncExternalStore } from "react";
import type { BankStore } from "../core_backend/bank_store.ts";
import type { BankEntity } from "../core_backend/bank_view.ts";

/**
 * Re-renders when the entity (or a child it shows) changes, and returns its revision.
 * Use the revision as a dependency for values computed from the mutable entity.
 */
export function useEntityRevision(store: BankStore, entity: BankEntity) {
    return useSyncExternalStore(store.subscribe, () =>
        store.getEntityRevision(entity)
    );
}
