// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ForwardedSynthEvent } from "../synth_host/protocol.ts";
import { LayoutContext } from "../layout/layout_context.ts";
import { BackStackContext } from "./back_stack_context.ts";
import { BackStack } from "./back_stack.ts";
import { PianoCaptureBar } from "./piano_capture_bar.tsx";
import { PhoneShellContext } from "./phone_shell_context.ts";
import { INITIAL_PHONE_SHELL_STATE } from "./phone_shell_state.ts";
import { createShellContext } from "../test_utils/shell_context.ts";

const handlers = vi.hoisted(() => ({
    current: undefined as ((event: ForwardedSynthEvent) => void) | undefined
}));

// Subscribes while mounted, as the real hook does with the engine's events
vi.mock("../hooks/use_synth_event.ts", async () => {
    const { useEffect } =
        await vi.importActual<typeof import("react")>("react");
    return {
        useSynthEvent: (handler: (event: ForwardedSynthEvent) => void) => {
            useEffect(() => {
                handlers.current = handler;
                return () => {
                    handlers.current = undefined;
                };
            });
        }
    };
});

function noteOn(channel: number, midiNote: number) {
    act(() => {
        handlers.current?.({
            type: "noteOn",
            data: { channel, midiNote, velocity: 100 }
        });
    });
}

function renderBar(count: 1 | 2 = 2, isCovered = false) {
    const onDone = vi.fn();
    const onCancel = vi.fn();
    const stack = new BackStack();
    const result = render(
        <LayoutContext value={"phone"}>
            <BackStackContext
                value={{
                    stack,
                    releaseSentinel: vi.fn(),
                    dropSentinel: vi.fn()
                }}
            >
                <PhoneShellContext
                    value={createShellContext({
                        ...INITIAL_PHONE_SHELL_STATE,
                        isNavigatorOpen: isCovered
                    })}
                >
                    <PianoCaptureBar
                        count={count}
                        prompt={"Play two keys"}
                        onDone={onDone}
                        onCancel={onCancel}
                    />
                </PhoneShellContext>
            </BackStackContext>
        </LayoutContext>
    );
    return { stack, onDone, onCancel, ...result };
}

describe("PianoCaptureBar", () => {
    beforeEach(() => {
        handlers.current = undefined;
    });
    afterEach(cleanup);

    it("ignores keys auditioned while the lists cover the editor", () => {
        const { onDone } = renderBar(1, true);
        noteOn(0, 64);
        expect(onDone).not.toHaveBeenCalled();
    });

    it("leaves back to the lists while they cover the editor", () => {
        const { stack, onCancel } = renderBar(2, true);
        let isHandled = true;
        act(() => {
            isHandled = stack.handleBack();
        });
        expect(isHandled).toBe(false);
        expect(onCancel).not.toHaveBeenCalled();
    });

    it("shows the count only when it asks for more than one key", () => {
        renderBar(1);
        expect(screen.queryByRole("status")).toBeNull();
        cleanup();
        renderBar(2);
        expect(screen.getByRole("status").textContent).toBe(
            "phoneLocale.capture.progress"
        );
    });

    it("calls onDone with two keys in played order", () => {
        const { onDone } = renderBar();
        noteOn(0, 64);
        expect(screen.getByText(/phoneLocale.capture.progress/)).toBeDefined();
        expect(onDone).not.toHaveBeenCalled();
        noteOn(3, 50);
        noteOn(0, 60);
        expect(onDone).toHaveBeenCalledOnce();
        expect(onDone).toHaveBeenCalledWith([64, 60]);
    });

    it("cancels on back", () => {
        const { stack, onCancel } = renderBar();
        act(() => {
            stack.handleBack();
        });
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it("stops listening when it unmounts", () => {
        const { onDone, unmount } = renderBar();
        noteOn(0, 64);
        unmount();
        noteOn(0, 62);
        expect(onDone).not.toHaveBeenCalled();
    });

    it("takes keys that arrive in one batch in order and finishes once", () => {
        const { onDone } = renderBar();
        // The client emits the host's events in one synchronous loop
        act(() => {
            for (const midiNote of [64, 60, 67]) {
                handlers.current?.({
                    type: "noteOn",
                    data: { channel: 0, midiNote, velocity: 100 }
                });
            }
        });
        expect(onDone).toHaveBeenCalledOnce();
        expect(onDone).toHaveBeenCalledWith([64, 60]);
    });
});
