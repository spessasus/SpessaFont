import { createContext, useContext } from "react";
import type { SavedSettingsType } from "./save_load/settings_typedef.ts";

export interface SettingsContextType {
    settings: SavedSettingsType;
    /**
     * Saves the changed settings and applies the theme and language.
     * The audio engine is updated by the caller.
     */
    updateSettings: (changes: Partial<SavedSettingsType>) => SavedSettingsType;
}

export const SettingsContext = createContext<SettingsContextType | null>(null);

export function useSettings() {
    const ctx = useContext(SettingsContext);
    if (!ctx) throw new Error("Used without SettingsProvider context!");
    return ctx;
}
