// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { useBackHandler } from "../hooks/use_back_handler.ts";
import { LayoutContext } from "../layout/layout_context.ts";
import { BACK_LEVELS } from "../phone_shell/back_stack.ts";
import { BackStackProvider } from "../phone_shell/back_stack_provider.tsx";
import { ModalDialog } from "./modal_dialog.tsx";

const fakeHistory: { state: unknown } = { state: null };

function pressBack() {
    act(() => {
        // jsdom has no PointerEvent, the listener only needs the type
        dispatchEvent(new MouseEvent("pointerup"));
        fakeHistory.state = null;
        dispatchEvent(new PopStateEvent("popstate"));
    });
}

function LowerLevel({ onBack }: { onBack: () => boolean }) {
    useBackHandler(true, BACK_LEVELS.closeNavigator, onBack);
    return null;
}

describe("ModalDialog back handling", () => {
    beforeEach(() => {
        fakeHistory.state = null;
        HTMLDialogElement.prototype.showModal = vi.fn();
        HTMLDialogElement.prototype.close = vi.fn();
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

    it("cancels a modal dialog on back", () => {
        const onCancel = vi.fn();
        render(
            <LayoutContext value={"phone"}>
                <BackStackProvider>
                    <ModalDialog
                        title={"Title"}
                        className={"x"}
                        onCancel={onCancel}
                    >
                        {null}
                    </ModalDialog>
                </BackStackProvider>
            </LayoutContext>
        );
        pressBack();
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("leaves doesLowerHandle levels alone when a dialog takes the back press", () => {
        const onCancel = vi.fn();
        const doesLowerHandle = vi.fn(() => true);
        render(
            <LayoutContext value={"phone"}>
                <BackStackProvider>
                    <LowerLevel onBack={doesLowerHandle} />
                    <ModalDialog
                        title={"Title"}
                        className={"x"}
                        onCancel={onCancel}
                    >
                        {null}
                    </ModalDialog>
                </BackStackProvider>
            </LayoutContext>
        );
        pressBack();
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(doesLowerHandle).not.toHaveBeenCalled();
    });
});
