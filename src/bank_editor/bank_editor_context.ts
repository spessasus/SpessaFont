import { createContext, useContext } from "react";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { HistoryActionGroup } from "../core_backend/history.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";

export interface BankEditorContextType {
    session: BankSession;
    /**
     * Runs the actions through the history and selects the element they focus, if any.
     */
    apply: (actions: HistoryActionGroup) => void;
    setView: (view: BankEditView) => void;
}

export const BankEditorContext = createContext<BankEditorContextType | null>(
    null
);

export function useBankEditor() {
    const ctx = useContext(BankEditorContext);
    if (!ctx) throw new Error("Used outside of a BankEditor!");
    return ctx;
}
