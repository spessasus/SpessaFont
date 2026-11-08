// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { SettingsProvider } from "../settings/settings_provider.tsx";
import { useSettings } from "../settings/settings_context.ts";
import {
    DEFAULT_SETTINGS,
    SPESSAFONT_SETTINGS_KEY
} from "../settings/save_load/settings_typedef.ts";
import { LayoutProvider } from "./layout_provider.tsx";
import { useLayout } from "./layout_context.ts";
import { stubMatchMedia } from "../test_utils/stub_match_media.ts";

function wrapper({ children }: { children: ReactNode }) {
    return (
        <SettingsProvider initialSettings={DEFAULT_SETTINGS}>
            <LayoutProvider>{children}</LayoutProvider>
        </SettingsProvider>
    );
}

describe("LayoutProvider", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        localStorage.removeItem(SPESSAFONT_SETTINGS_KEY);
        delete document.documentElement.dataset.layout;
    });

    it("follows the query in auto and the override otherwise", () => {
        stubMatchMedia(true);
        const { result } = renderHook(
            () => ({ layout: useLayout(), settings: useSettings() }),
            { wrapper }
        );
        expect(result.current.layout).toBe("phone");
        expect(document.documentElement.dataset.layout).toBe("phone");

        act(() => {
            result.current.settings.updateSettings({ layout: "desktop" });
        });
        expect(result.current.layout).toBe("desktop");
        expect(document.documentElement.dataset.layout).toBe("desktop");
    });

    it("throws outside the provider", () => {
        expect(() => renderHook(() => useLayout())).toThrow(
            "Used without LayoutProvider!"
        );
    });
});
