import type { BankSession } from "../core_backend/bank_session.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { getObjectId } from "../utils/object_id.ts";
import { useBankSnapshot } from "./use_bank_snapshot.ts";

/**
 * The shown element's name, undefined on the overview.
 */
export function useViewName(session: BankSession, view: BankEditView) {
    const viewId = view === "info" ? undefined : getObjectId(view);
    return useBankSnapshot(session.store, (s) =>
        viewId === undefined
            ? undefined
            : (
                  s.views.presets.get(viewId) ??
                  s.views.instruments.get(viewId) ??
                  s.views.samples.get(viewId)
              )?.name
    );
}
