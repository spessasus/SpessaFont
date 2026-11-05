import { createContext, type ReactNode, useContext } from "react";

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

/**
 * Renders a dialog of a tool. It calls `onAnswer` once, with undefined when canceled.
 */
export type DialogRenderer<T> = (
    onAnswer: (value: T | undefined) => void
) => ReactNode;

export interface DialogsAPI {
    /**
     * Asks for one of the items, with a search. Resolves to undefined when canceled.
     */
    pickElement: <T>(options: PickElementOptions<T>) => Promise<T | undefined>;
    /**
     * Asks for a number. Resolves to undefined when canceled.
     */
    askNumber: (options: AskNumberOptions) => Promise<number | undefined>;
    /**
     * Shows a dialog of a tool, for the questions that need more than one number.
     * The dialog is rendered outside the bank editor, so it gets what it shows from the caller.
     * Resolves to its answer, or undefined when canceled.
     */
    openDialog: <T>(render: DialogRenderer<T>) => Promise<T | undefined>;
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
