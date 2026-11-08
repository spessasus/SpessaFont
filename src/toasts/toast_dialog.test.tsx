// @vitest-environment jsdom
import { useState } from "react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useBackHandler } from "../hooks/use_back_handler.ts";
import { LayoutContext } from "../layout/layout_context.ts";
import type { LayoutMode } from "../layout/layout_setting.ts";
import { BACK_LEVELS } from "../phone_shell/back_stack.ts";
import { BackStackProvider } from "../phone_shell/back_stack_provider.tsx";
import { setUpFakeHistory } from "../test_utils/fake_history.ts";
import type { FakeHistory } from "../test_utils/fake_history.ts";
import { ToastDialog } from "./toast_dialog.tsx";
import type { ToastDialogButton } from "./toast_dialog.tsx";

function LowerLevel({ onBack }: { onBack: () => boolean }) {
    useBackHandler(true, BACK_LEVELS.closeNavigator, onBack);
    return null;
}

interface ExitingQuestionProps {
    buttons: ToastDialogButton[];
    onDismiss: () => void;
    children: ReactNode;
}

/**
 * Stays mounted once dismissed and only turns invisible, as a toast does in its exit animation.
 */
function ExitingQuestion({
    buttons,
    onDismiss,
    children
}: ExitingQuestionProps) {
    const [isVisible, setIsVisible] = useState(true);
    return (
        <ToastDialog
            buttons={buttons}
            isVisible={isVisible}
            onDismiss={() => {
                setIsVisible(false);
                onDismiss();
            }}
        >
            {children}
        </ToastDialog>
    );
}

function renderQuestion(layout: LayoutMode) {
    const leave = vi.fn();
    const stay = vi.fn();
    const onDismiss = vi.fn();
    const doesLowerHandle = vi.fn(() => true);
    render(
        <LayoutContext value={layout}>
            <BackStackProvider>
                <LowerLevel onBack={doesLowerHandle} />
                <ExitingQuestion
                    buttons={[
                        { label: "Leave", onClick: leave },
                        { label: "Stay", onClick: stay }
                    ]}
                    onDismiss={onDismiss}
                >
                    {"Leave?"}
                </ExitingQuestion>
            </BackStackProvider>
        </LayoutContext>
    );
    return { leave, stay, onDismiss, doesLowerHandle };
}

describe("ToastDialog back handling", () => {
    let fakeHistory: FakeHistory;
    beforeEach(() => {
        fakeHistory = setUpFakeHistory();
    });
    afterEach(() => {
        cleanup();
        fakeHistory.restore();
    });

    it("answers with the safe button on back in phone mode", () => {
        const { leave, stay, onDismiss } = renderQuestion("phone");
        fakeHistory.pressBack();
        expect(stay).toHaveBeenCalledTimes(1);
        expect(leave).not.toHaveBeenCalled();
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("passes the next back press on once answered with back", () => {
        const { stay, doesLowerHandle } = renderQuestion("phone");
        fakeHistory.pressBack();
        expect(doesLowerHandle).not.toHaveBeenCalled();

        fakeHistory.pressBack();
        expect(stay).toHaveBeenCalledTimes(1);
        expect(doesLowerHandle).toHaveBeenCalledTimes(1);
    });

    it("passes the next back press on once answered with a button or Escape", () => {
        const { leave, stay, doesLowerHandle } = renderQuestion("phone");
        fireEvent.click(screen.getByText("Leave"));
        expect(leave).toHaveBeenCalledTimes(1);
        fakeHistory.pressBack();
        expect(stay).not.toHaveBeenCalled();
        expect(doesLowerHandle).toHaveBeenCalledTimes(1);

        cleanup();
        const second = renderQuestion("phone");
        fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
        expect(second.stay).toHaveBeenCalledTimes(1);
        fakeHistory.pressBack();
        expect(second.stay).toHaveBeenCalledTimes(1);
        expect(second.doesLowerHandle).toHaveBeenCalledTimes(1);
    });

    it("ignores back on desktop", () => {
        const { leave, stay, onDismiss } = renderQuestion("desktop");
        fakeHistory.pressBack();
        expect(stay).not.toHaveBeenCalled();
        expect(leave).not.toHaveBeenCalled();
        expect(onDismiss).not.toHaveBeenCalled();
    });
});
