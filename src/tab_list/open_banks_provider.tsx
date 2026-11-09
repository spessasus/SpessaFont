import { type ReactNode, useMemo } from "react";
import type { BankSession } from "../core_backend/bank_session.ts";
import { OpenBanksContext } from "./open_banks_context.ts";

interface OpenBanksProviderProps {
    sessions: readonly BankSession[];
    activeId: number | undefined;
    children?: ReactNode;
}

/**
 * Tells the editor which banks are open, for "Copy to bank…".
 */
export function OpenBanksProvider({
    sessions,
    activeId,
    children
}: OpenBanksProviderProps) {
    const value = useMemo(() => ({ sessions, activeId }), [sessions, activeId]);
    return <OpenBanksContext value={value}>{children}</OpenBanksContext>;
}
