// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { useBackHandler } from "../hooks/use_back_handler.ts";
import { LayoutContext } from "../layout/layout_context.ts";
import { BACK_LEVELS } from "../phone_shell/back_stack.ts";
import { BackStackProvider } from "../phone_shell/back_stack_provider.tsx";
import { setUpFakeHistory } from "../test_utils/fake_history.ts";
import type { FakeHistory } from "../test_utils/fake_history.ts";
import { ModalDialog } from "./modal_dialog.tsx";

function LowerLevel({ onBack }: { onBack: () => boolean }) {
    useBackHandler(true, BACK_LEVELS.closeNavigator, onBack);
    return null;
}

describe("ModalDialog back handling", () => {
    let fakeHistory: FakeHistory;
    beforeEach(() => {
        HTMLDialogElement.prototype.showModal = vi.fn();
        HTMLDialogElement.prototype.close = vi.fn();
        fakeHistory = setUpFakeHistory();
    });
    afterEach(() => {
        cleanup();
        fakeHistory.restore();
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
        fakeHistory.pressBack();
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("leaves lower levels alone when a dialog takes the back press", () => {
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
        fakeHistory.pressBack();
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(doesLowerHandle).not.toHaveBeenCalled();
    });
});
