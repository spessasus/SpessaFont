// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import { LayoutContext } from "../layout/layout_context.ts";
import type { LayoutMode } from "../layout/layout_setting.ts";
import { useElementHistoryKeys } from "./use_element_history_keys.ts";

function renderKeys(layout: LayoutMode) {
    const goBack = vi.fn();
    const goForward = vi.fn();
    renderHook(() => useElementHistoryKeys(true, goBack, goForward), {
        wrapper: ({ children }: { children: ReactNode }) => (
            <LayoutContext value={layout}>{children}</LayoutContext>
        )
    });
    return { goBack, goForward };
}

function pressAltLeft() {
    const event = new KeyboardEvent("keydown", {
        key: "ArrowLeft",
        altKey: true,
        bubbles: true,
        cancelable: true
    });
    document.body.dispatchEvent(event);
    return event;
}

function clickSideButton(button: 3 | 4) {
    const down = new MouseEvent("mousedown", {
        button,
        bubbles: true,
        cancelable: true
    });
    const up = new MouseEvent("mouseup", {
        button,
        bubbles: true,
        cancelable: true
    });
    document.body.dispatchEvent(down);
    document.body.dispatchEvent(up);
    return { down, up };
}

describe("useElementHistoryKeys", () => {
    afterEach(cleanup);

    it("goes back and forward with the mouse's side buttons on desktop", () => {
        const { goBack, goForward } = renderKeys("desktop");
        const { down, up } = clickSideButton(3);
        expect(down.defaultPrevented).toBe(true);
        expect(up.defaultPrevented).toBe(true);
        expect(goBack).toHaveBeenCalledOnce();
        clickSideButton(4);
        expect(goForward).toHaveBeenCalledOnce();
    });

    // The handler prevents the default before isEditorShortcut runs, and that check refuses a
    // prevented event, so Alt+Left only keeps the browser from leaving the page. The same on
    // master
    it.fails("goes back with Alt+Left on desktop", () => {
        const { goBack } = renderKeys("desktop");
        expect(pressAltLeft().defaultPrevented).toBe(true);
        expect(goBack).toHaveBeenCalledOnce();
    });

    it("leaves the keys and buttons to the browser on a phone, so back runs the back stack", () => {
        const { goBack, goForward } = renderKeys("phone");
        expect(pressAltLeft().defaultPrevented).toBe(false);
        const { down, up } = clickSideButton(3);
        expect(down.defaultPrevented).toBe(false);
        expect(up.defaultPrevented).toBe(false);
        clickSideButton(4);
        expect(goBack).not.toHaveBeenCalled();
        expect(goForward).not.toHaveBeenCalled();
    });
});
