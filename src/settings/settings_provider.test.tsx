// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { SettingsProvider } from "./settings_provider.tsx";
import { useSettings } from "./settings_context.ts";
import { loadSettings } from "./save_load/load.ts";
import {
    DEFAULT_SETTINGS,
    SPESSAFONT_SETTINGS_KEY
} from "./save_load/settings_typedef.ts";

function wrapper({ children }: { children: ReactNode }) {
    return (
        <SettingsProvider initialSettings={DEFAULT_SETTINGS}>
            {children}
        </SettingsProvider>
    );
}

describe("SettingsProvider", () => {
    afterEach(() => {
        localStorage.removeItem(SPESSAFONT_SETTINGS_KEY);
        delete document.documentElement.dataset.theme;
    });

    it("saves changes, applies the theme, and returns the new settings", () => {
        const { result } = renderHook(() => useSettings(), { wrapper });
        let returned = DEFAULT_SETTINGS;

        act(() => {
            returned = result.current.updateSettings({
                theme: "light",
                volume: 2
            });
        });

        const expected = { ...DEFAULT_SETTINGS, theme: "light", volume: 2 };
        expect(returned).toEqual(expected);
        expect(result.current.settings).toEqual(expected);
        expect(loadSettings()).toEqual(expected);
        expect(document.documentElement.dataset.theme).toBe("light");
    });

    it("throws a clear error outside the provider", () => {
        expect(() => renderHook(() => useSettings())).toThrow(
            "SettingsProvider"
        );
    });
});
