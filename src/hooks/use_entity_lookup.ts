import { useMemo } from "react";
import type { BankStore } from "../core_backend/bank_store.ts";
import { getObjectId } from "../utils/object_id.ts";
import { useBankSnapshot } from "./use_bank_snapshot.ts";

/**
 * Finds the core object of an element by its view id, for the identity a handler or the
 * selection needs (never to read its data in render, that comes from the views). Built from the
 * store's element lists, so it follows their changes.
 */
export function useEntityLookup(store: BankStore) {
    const presets = useBankSnapshot(store, (s) => s.presets);
    const instruments = useBankSnapshot(store, (s) => s.instruments);
    const samples = useBankSnapshot(store, (s) => s.samples);
    return useMemo(() => {
        const byId = <T extends object>(list: readonly T[]) =>
            new Map(list.map((e) => [getObjectId(e), e]));
        const presetMap = byId(presets);
        const instrumentMap = byId(instruments);
        const sampleMap = byId(samples);
        return {
            preset: (id: number) => presetMap.get(id),
            instrument: (id: number) => instrumentMap.get(id),
            sample: (id: number) => sampleMap.get(id)
        };
    }, [presets, instruments, samples]);
}
