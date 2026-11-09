import { createContext, useContext } from "react";
import type { BankSession } from "../core_backend/bank_session.ts";

/**
 * The open banks, in tab order, and the shown one.
 */
export interface OpenBanks {
    sessions: readonly BankSession[];
    activeId: number | undefined;
}

export const OpenBanksContext = createContext<OpenBanks | null>(null);

export function useOpenBanks() {
    const banks = useContext(OpenBanksContext);
    if (!banks) {
        throw new Error(
            "useOpenBanks is used outside of an OpenBanksProvider."
        );
    }
    return banks;
}
