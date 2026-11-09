// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useInstallPrompt } from "./use_install_prompt.ts";

function createOffer() {
    const offer = new Event("beforeinstallprompt", { cancelable: true });
    const prompt = vi.fn(() => Promise.resolve());
    Object.assign(offer, {
        prompt,
        userChoice: Promise.resolve({ outcome: "accepted", platform: "web" })
    });
    return { offer, prompt };
}

describe("useInstallPrompt", () => {
    it("offers nothing until the browser does", () => {
        const { result } = renderHook(() => useInstallPrompt());
        expect(result.current).toBeUndefined();
    });

    it("keeps the offer, prevents the mini bar and installs once", async () => {
        const { result } = renderHook(() => useInstallPrompt());
        const { offer, prompt } = createOffer();
        act(() => {
            dispatchEvent(offer);
        });
        expect(offer.defaultPrevented).toBe(true);
        expect(result.current).toBeTypeOf("function");
        await act(async () => {
            await result.current?.();
        });
        expect(prompt).toHaveBeenCalledTimes(1);
        expect(result.current).toBeUndefined();
    });

    it("drops the offer when the app gets installed", () => {
        const { result } = renderHook(() => useInstallPrompt());
        act(() => {
            dispatchEvent(createOffer().offer);
        });
        expect(result.current).toBeDefined();
        act(() => {
            dispatchEvent(new Event("appinstalled"));
        });
        expect(result.current).toBeUndefined();
    });
});
