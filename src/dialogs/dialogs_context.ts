import { createContext, useContext } from "react";

export interface PickElementOptions<T> {
    title: string;
    items: readonly T[];
    getLabel: (item: T) => string;
}

export interface AskNumberOptions {
    title: string;
    label: string;
    initial: number;
    min: number;
    max: number;
    step: number;
}

export interface DialogsAPI {
    /**
     * Asks for one of the items, with a search. Resolves to undefined when canceled.
     */
    pickElement: <T>(options: PickElementOptions<T>) => Promise<T | undefined>;
    /**
     * Asks for a number. Resolves to undefined when canceled.
     */
    askNumber: (options: AskNumberOptions) => Promise<number | undefined>;
}

export const DialogsContext = createContext<DialogsAPI | null>(null);

/**
 * Modal dialogs that return the answer as a promise, for commands that need one more choice.
 */
export function useDialogs() {
    const dialogs = useContext(DialogsContext);
    if (!dialogs) {
        throw new Error("Used without DialogsProvider context!");
    }
    return dialogs;
}
