// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
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

function pressAlt(
    key: "ArrowLeft" | "ArrowRight",
    target: Element = document.body
) {
    const event = new KeyboardEvent("keydown", {
        key,
        altKey: true,
        bubbles: true,
        cancelable: true
    });
    target.dispatchEvent(event);
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

    it("goes back with Alt+Left on desktop", () => {
        const { goBack } = renderKeys("desktop");
        expect(pressAlt("ArrowLeft").defaultPrevented).toBe(true);
        expect(goBack).toHaveBeenCalledOnce();
    });

    it("goes forward with Alt+Right on desktop", () => {
        const { goForward } = renderKeys("desktop");
        expect(pressAlt("ArrowRight").defaultPrevented).toBe(true);
        expect(goForward).toHaveBeenCalledOnce();
    });

    it("keeps the browser from leaving but moves nothing with a dialog open", () => {
        const { goBack } = renderKeys("desktop");
        const dialog = document.createElement("dialog");
        dialog.open = true;
        const button = document.createElement("button");
        dialog.append(button);
        document.body.append(dialog);
        onTestFinished(() => {
            dialog.remove();
        });
        button.focus();
        expect(pressAlt("ArrowLeft", button).defaultPrevented).toBe(true);
        expect(goBack).not.toHaveBeenCalled();
    });

    it("moves nothing with Alt+Left in a text field on desktop", () => {
        const { goBack } = renderKeys("desktop");
        const input = document.createElement("input");
        document.body.append(input);
        onTestFinished(() => {
            input.remove();
        });
        input.focus();
        pressAlt("ArrowLeft", input);
        expect(goBack).not.toHaveBeenCalled();
    });

    it("leaves the keys and buttons to the browser on a phone, so back runs the back stack", () => {
        const { goBack, goForward } = renderKeys("phone");
        expect(pressAlt("ArrowLeft").defaultPrevented).toBe(false);
        const { down, up } = clickSideButton(3);
        expect(down.defaultPrevented).toBe(false);
        expect(up.defaultPrevented).toBe(false);
        clickSideButton(4);
        expect(goBack).not.toHaveBeenCalled();
        expect(goForward).not.toHaveBeenCalled();
    });
});
