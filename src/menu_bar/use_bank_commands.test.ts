// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import toast, { useToasterStore } from "react-hot-toast";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { useBankCommands } from "./use_bank_commands.ts";

afterEach(() => {
    act(() => toast.remove());
});

describe("useBankCommands", () => {
    it("shows one toast for a held Ctrl+Z past the start of the history", () => {
        const session = createTestSession();
        const { result } = renderHook(() => ({
            commands: useBankCommands(session, () => undefined),
            toasts: useToasterStore().toasts.filter((t) => t.visible)
        }));
        act(() => {
            // About one second of key repeats
            for (let i = 0; i < 30; i++) result.current.commands.undo();
        });
        expect(result.current.toasts).toHaveLength(1);
        act(() => {
            for (let i = 0; i < 30; i++) result.current.commands.redo();
        });
        expect(result.current.toasts).toHaveLength(1);
    });
});
