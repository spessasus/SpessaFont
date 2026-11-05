import { createContext, useContext } from "react";
import type { SelectOption } from "./translated_options.ts";

export interface TranslatedOptions {
    controllers: SelectOption[];
    destinations: SelectOption[];
}

export const TranslatedOptionsContext = createContext<TranslatedOptions | null>(
    null
);

/**
 * The translated option lists shared by every controller and destination picker.
 */
export function useTranslatedOptions() {
    const ctx = useContext(TranslatedOptionsContext);
    if (!ctx) {
        throw new Error("Used without TranslatedOptionsProvider context!");
    }
    return ctx;
}
