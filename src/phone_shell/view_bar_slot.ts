import { createContext, useContext } from "react";

/**
 * The place in the landscape element bar row where the grid puts its view bar. Null means the
 * view bar renders in place (portrait, desktop).
 */
export const ViewBarSlotContext = createContext<HTMLDivElement | null>(null);

export function useViewBarSlot() {
    return useContext(ViewBarSlotContext);
}
