// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ForwardedSynthEvent } from "../synth_host/protocol.ts";
import { LayoutContext } from "../layout/layout_context.ts";
import { BackStackContext } from "./back_stack_context.ts";
import { BackStack } from "./back_stack.ts";
import { PianoCaptureBar } from "./piano_capture_bar.tsx";

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

function renderBar() {
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
                <PianoCaptureBar
                    count={2}
                    prompt={"Play two keys"}
                    onDone={onDone}
                    onCancel={onCancel}
                />
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
