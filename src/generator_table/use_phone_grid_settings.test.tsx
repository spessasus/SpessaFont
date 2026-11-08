// @vitest-environment jsdom
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { SettingsContext } from "../settings/settings_context.ts";
import { DEFAULT_SETTINGS } from "../settings/save_load/settings_typedef.ts";
import { usePhoneGridSettings } from "./use_phone_grid_settings.ts";

function renderSettings() {
    const updateSettings = vi.fn(() => DEFAULT_SETTINGS);
    const settings = {
        ...DEFAULT_SETTINGS,
        phoneCollapsedGroups: ["volume" as const]
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
        <SettingsContext.Provider value={{ settings, updateSettings }}>
            {children}
        </SettingsContext.Provider>
    );
    const { result } = renderHook(() => usePhoneGridSettings(), { wrapper });
    return { result, updateSettings };
}

describe("usePhoneGridSettings", () => {
    it("toggles collapsed groups in the settings", () => {
        const { result, updateSettings } = renderSettings();
        expect([...result.current.collapsed]).toEqual(["volume"]);

        act(() => {
            result.current.toggleGroup("volume");
        });
        expect(updateSettings).toHaveBeenLastCalledWith({
            phoneCollapsedGroups: []
        });

        act(() => {
            result.current.toggleGroup("filter");
        });
        expect(updateSettings).toHaveBeenLastCalledWith({
            phoneCollapsedGroups: ["volume", "filter"]
        });
    });

    it("writes the mode and Values only", () => {
        const { result, updateSettings } = renderSettings();

        act(() => {
            result.current.setMode("oneZone");
        });
        expect(updateSettings).toHaveBeenLastCalledWith({
            phoneGridMode: "oneZone"
        });

        act(() => {
            result.current.setValuesOnly(true);
        });
        expect(updateSettings).toHaveBeenLastCalledWith({
            phoneValuesOnly: true
        });
    });
});
