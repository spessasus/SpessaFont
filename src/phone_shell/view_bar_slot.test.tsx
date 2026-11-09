// @vitest-environment jsdom
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useViewBarSlot, ViewBarSlotContext } from "./view_bar_slot.ts";

describe("useViewBarSlot", () => {
    it("has no slot outside a provider", () => {
        const { result } = renderHook(() => useViewBarSlot());
        expect(result.current).toBeNull();
    });

    it("gives the slot node inside the provider", () => {
        const slot = document.createElement("div");
        const { result } = renderHook(() => useViewBarSlot(), {
            wrapper: ({ children }: { children: ReactNode }) => (
                <ViewBarSlotContext value={slot}>{children}</ViewBarSlotContext>
            )
        });
        expect(result.current).toBe(slot);
    });
});
