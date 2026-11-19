import type { BankSession } from "../core_backend/bank_session.ts";
import { getObjectId } from "../utils/object_id.ts";
import { useBankSnapshot } from "./use_bank_snapshot.ts";

/**
 * What a modulator list's curve pickers need: the views of the bank's custom curves, and the
 * curve of a view id, read when one is picked.
 */
export function useCustomCurves(session: BankSession) {
    const customCurves = useBankSnapshot(
        session.store,
        (s) => s.views.customCurves
    );
    const getCustomCurve = (id: number) =>
        session.document.bank.customCurves.find((c) => getObjectId(c) === id);
    return { customCurves, getCustomCurve };
}
