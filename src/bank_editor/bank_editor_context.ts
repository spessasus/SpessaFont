import { createContext, useContext } from "react";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { HistoryActionGroup } from "../core_backend/history.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import type { BasicSample } from "spessasynth_core";

export interface BankEditorContextType {
    session: BankSession;
    /**
     * Runs the actions through the history and selects the element they focus, if any.
     * Quick repeats with the same merge key become one undo step (see `HistoryManager.do`).
     */
    apply: (actions: HistoryActionGroup, mergeKey?: string) => void;
    /**
     * Runs actions that make a new element from the list selection and shows it like a pick
     * in the lists, which closes the phone navigator unless it is pinned. Falls back to `apply`.
     */
    applyCreate?: (actions: HistoryActionGroup) => void;
    setView: (view: BankEditView) => void;
    /**
     * Shows the sample and plays it once from the start.
     */
    playSample: (sample: BasicSample) => void;
}

export const BankEditorContext = createContext<BankEditorContextType | null>(
    null
);

export function useBankEditor() {
    const ctx = useContext(BankEditorContext);
    if (!ctx) throw new Error("Used outside of a BankEditor!");
    return ctx;
}
