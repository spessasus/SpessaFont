import { createContext } from "react";

export interface PresenceState {
    /**
     * The parent stopped rendering the child, which is shown until its exit animation ends.
     */
    isClosing: boolean;
    /**
     * Unmounts the closing child.
     */
    onExited: () => void;
    /**
     * Counts the children that animate, until the returned function runs. With none, a
     * closing child unmounts at once.
     */
    register: () => () => void;
}

export const PresenceContext = createContext<PresenceState | null>(null);
