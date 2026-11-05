// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import toast, { useToasterStore } from "react-hot-toast";
import { showToastDialog } from "./show_toast_dialog.tsx";

afterEach(() => {
    act(() => toast.remove());
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
});
