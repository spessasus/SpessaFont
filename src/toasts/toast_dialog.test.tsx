// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { LayoutContext } from "../layout/layout_context.ts";
import type { LayoutMode } from "../layout/layout_setting.ts";
import { BackStackProvider } from "../phone_shell/back_stack_provider.tsx";
import { ToastDialog } from "./toast_dialog.tsx";

const fakeHistory: { state: unknown } = { state: null };

function pressBack() {
    act(() => {
        // jsdom has no PointerEvent, the listener only needs the type
        dispatchEvent(new MouseEvent("pointerup"));
        fakeHistory.state = null;
        dispatchEvent(new PopStateEvent("popstate"));
    });
}

function renderQuestion(layout: LayoutMode) {
    const leave = vi.fn();
    const stay = vi.fn();
    const onDismiss = vi.fn();
    render(
        <LayoutContext value={layout}>
            <BackStackProvider>
                <ToastDialog
                    buttons={[
                        { label: "Leave", onClick: leave },
                        { label: "Stay", onClick: stay }
                    ]}
                    onDismiss={onDismiss}
                >
                    {"Leave?"}
                </ToastDialog>
            </BackStackProvider>
        </LayoutContext>
    );
    return { leave, stay, onDismiss };
}

describe("ToastDialog back handling", () => {
    beforeEach(() => {
        fakeHistory.state = null;
        vi.spyOn(history, "pushState").mockImplementation((state: unknown) => {
            fakeHistory.state = state;
        });
        vi.spyOn(history, "state", "get").mockImplementation(
            () => fakeHistory.state
        );
        vi.spyOn(history, "back").mockImplementation(() => undefined);
    });
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("answers with the safe button on back in phone mode", () => {
        const { leave, stay, onDismiss } = renderQuestion("phone");
        pressBack();
        expect(stay).toHaveBeenCalledTimes(1);
        expect(leave).not.toHaveBeenCalled();
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("ignores back on desktop", () => {
        const { leave, stay, onDismiss } = renderQuestion("desktop");
        pressBack();
        expect(stay).not.toHaveBeenCalled();
        expect(leave).not.toHaveBeenCalled();
        expect(onDismiss).not.toHaveBeenCalled();
    });
});
