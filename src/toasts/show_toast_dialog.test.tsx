// @vitest-environment jsdom
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import toast, { Toaster, useToasterStore } from "react-hot-toast";
import { LayoutContext } from "../layout/layout_context.ts";
import { BackStackProvider } from "../phone_shell/back_stack_provider.tsx";
import { setUpFakeHistory } from "../test_utils/fake_history.ts";
import { stubMatchMedia } from "../test_utils/stub_match_media.ts";
import { showToastDialog } from "./show_toast_dialog.tsx";

afterEach(() => {
    act(() => toast.remove());
    cleanup();
});

function useQuestions() {
    return useToasterStore().toasts.filter(
        (t) => t.visible && t.duration === Infinity
    );
}

const ask = () =>
    showToastDialog({
        id: "close-1",
        content: "Bank has unsaved changes.",
        buttons: [{ label: "Keep" }]
    });

const askStay = (onStay: () => void) =>
    showToastDialog({
        id: "close-1",
        content: "Bank has unsaved changes.",
        buttons: [{ label: "Close" }, { label: "Keep", onClick: onStay }]
    });

describe("showToastDialog", () => {
    it("shows a question with an id once, however often it is asked", () => {
        const { result } = renderHook(useQuestions);
        act(() => {
            ask();
            ask();
        });
        expect(result.current).toHaveLength(1);
    });

    it("brings a question back that newer toasts pushed out", () => {
        const { result } = renderHook(useQuestions);
        act(() => {
            ask();
        });
        // react-hot-toast keeps 20 toasts and drops the oldest
        act(() => {
            for (let i = 0; i < 20; i++) toast(`other ${i}`);
        });
        expect(result.current).toHaveLength(0);
        act(() => {
            ask();
        });
        expect(result.current).toHaveLength(1);
    });

    it("dismisses a question by its id", () => {
        const { result } = renderHook(useQuestions);
        act(() => {
            ask();
        });
        act(() => toast.dismiss("close-1"));
        expect(result.current).toHaveLength(0);
    });

    it("answers a question asked again during its exit with back", () => {
        // The Toaster asks for reduced motion
        stubMatchMedia(false);
        const fakeHistory = setUpFakeHistory();
        onTestFinished(() => fakeHistory.restore());
        render(
            <LayoutContext value={"phone"}>
                <BackStackProvider>
                    <Toaster />
                </BackStackProvider>
            </LayoutContext>
        );
        const firstStay = vi.fn();
        const secondStay = vi.fn();
        act(() => {
            askStay(firstStay);
        });
        fakeHistory.pressBack();
        expect(firstStay).toHaveBeenCalledTimes(1);

        // The first one is still mounted for its exit animation
        act(() => {
            askStay(secondStay);
        });
        fakeHistory.pressBack();
        expect(secondStay).toHaveBeenCalledTimes(1);
    });
});
