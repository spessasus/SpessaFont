import type { ReactNode } from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TranslatedOptionsContext } from "./translated_options_context.ts";
import {
    getControllerOptions,
    getDestinationOptions
} from "./translated_options.ts";

interface TranslatedOptionsProviderProps {
    children?: ReactNode;
}

/**
 * Builds the option lists once per language instead of once per picker,
 * since a modulator list can show hundreds of pickers.
 */
export function TranslatedOptionsProvider({
    children
}: TranslatedOptionsProviderProps) {
    const { t } = useTranslation();
    const value = useMemo(
        () => ({
            controllers: getControllerOptions(t),
            destinations: getDestinationOptions(t)
        }),
        [t]
    );
    return (
        <TranslatedOptionsContext value={value}>
            {children}
        </TranslatedOptionsContext>
    );
}
