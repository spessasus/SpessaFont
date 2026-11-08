import { createContext, useContext } from "react";
import type { BackStack } from "./back_stack.ts";

export interface BackStackContextValue {
    stack: BackStack;
    /**
     * Leaves the sentinel off after the back press that is running now.
     */
    releaseSentinel: () => void;
    /**
     * Removes the sentinel with history.back() without running the stack.
     */
    dropSentinel: () => void;
}

export const BackStackContext = createContext<BackStackContextValue | null>(
    null
);

/**
 * Returns null on desktop and outside the provider, so shared components can call it in both
 * layouts.
 */
export function useBackStack() {
    return useContext(BackStackContext);
}
