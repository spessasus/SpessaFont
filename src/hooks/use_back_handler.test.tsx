// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import type { MockInstance } from "vitest";
import { LayoutContext } from "../layout/layout_context.ts";
import type { LayoutMode } from "../layout/layout_setting.ts";
import { BackStackProvider } from "../phone_shell/back_stack_provider.tsx";
import {
    BackStackContext,
    useBackStack
} from "../phone_shell/back_stack_context.ts";
import { BACK_LEVELS, BackStack } from "../phone_shell/back_stack.ts";
import { useBackHandler } from "./use_back_handler.ts";

function createWrapper(layout: LayoutMode) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return (
            <LayoutContext value={layout}>
                <BackStackProvider>{children}</BackStackProvider>
            </LayoutContext>
        );
    };
}

function LayoutHarness({ layout }: { layout: LayoutMode }) {
    return (
        <LayoutContext value={layout}>
            <BackStackProvider>{null}</BackStackProvider>
        </LayoutContext>
    );
}

function pressAnywhere() {
    act(() => {
        // jsdom has no PointerEvent, the listener only needs the type
        dispatchEvent(new MouseEvent("pointerup"));
    });
}

/**
 * The entry history.state reads, kept by the pushState stand-in.
 */
const fakeHistory: { state: unknown } = { state: null };

function pressBack() {
    act(() => {
        fakeHistory.state = null;
        dispatchEvent(new PopStateEvent("popstate"));
    });
}

describe("useBackHandler", () => {
    let pushState: MockInstance<History["pushState"]>;
    let back: MockInstance<History["back"]>;
    beforeEach(() => {
        // No real entries, so a history.back() cannot fire a popstate into the next test
        fakeHistory.state = null;
        pushState = vi
            .spyOn(history, "pushState")
            .mockImplementation((state: unknown) => {
                fakeHistory.state = state;
            });
        vi.spyOn(history, "state", "get").mockImplementation(
            () => fakeHistory.state
        );
        back = vi.spyOn(history, "back").mockImplementation(() => undefined);
    });
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("pushes the sentinel on the first pointerup, runs on popstate and pushes again", () => {
        const doesHandleBack = vi.fn(() => true);
        renderHook(
            () => useBackHandler(true, BACK_LEVELS.transient, doesHandleBack),
            {
                wrapper: createWrapper("phone")
            }
        );
        expect(pushState).not.toHaveBeenCalled();

        pressAnywhere();
        expect(pushState).toHaveBeenCalledWith({ spessafont: "back" }, "");
        pressAnywhere();
        expect(pushState).toHaveBeenCalledTimes(1);

        pressBack();
        expect(doesHandleBack).toHaveBeenCalledTimes(1);
        expect(pushState).toHaveBeenCalledTimes(2);
    });

    it("unregisters when it turns inactive", () => {
        const doesHandleBack = vi.fn(() => true);
        const { rerender } = renderHook(
            ({ isActive }) =>
                useBackHandler(isActive, BACK_LEVELS.transient, doesHandleBack),
            {
                wrapper: createWrapper("phone"),
                initialProps: { isActive: true }
            }
        );
        rerender({ isActive: false });

        pressAnywhere();
        pressBack();
        expect(doesHandleBack).not.toHaveBeenCalled();
    });

    it("calls the latest onBack", () => {
        const doesFirstHandle = vi.fn(() => true);
        const doesSecondHandle = vi.fn(() => true);
        const { rerender } = renderHook(
            ({ onBack }) => useBackHandler(true, BACK_LEVELS.transient, onBack),
            {
                wrapper: createWrapper("phone"),
                initialProps: { onBack: doesFirstHandle }
            }
        );
        rerender({ onBack: doesSecondHandle });

        pressAnywhere();
        pressBack();
        expect(doesFirstHandle).not.toHaveBeenCalled();
        expect(doesSecondHandle).toHaveBeenCalledTimes(1);
    });

    it("leaves the sentinel off when released and drops it without running the stack", () => {
        const doesHandleBack = vi.fn(() => true);
        const { result } = renderHook(
            () => {
                const backStack = useBackStack();
                useBackHandler(true, BACK_LEVELS.leave, () => {
                    backStack?.releaseSentinel();
                    return doesHandleBack();
                });
                return backStack;
            },
            { wrapper: createWrapper("phone") }
        );

        pressAnywhere();
        pressBack();
        expect(doesHandleBack).toHaveBeenCalledTimes(1);
        expect(pushState).toHaveBeenCalledTimes(1);

        // Any press cancels the release
        pressAnywhere();
        expect(pushState).toHaveBeenCalledTimes(2);

        act(() => {
            result.current?.dropSentinel();
        });
        expect(back).toHaveBeenCalledTimes(1);
        // The popstate history.back() causes is ignored
        pressBack();
        expect(doesHandleBack).toHaveBeenCalledTimes(1);
        expect(pushState).toHaveBeenCalledTimes(2);

        // Without a sentinel there is nothing to drop
        act(() => {
            result.current?.dropSentinel();
        });
        expect(back).toHaveBeenCalledTimes(1);
    });

    it("does not push a second sentinel after a reload on one", () => {
        fakeHistory.state = { spessafont: "back" };
        renderHook(() => useBackStack(), { wrapper: createWrapper("phone") });

        pressAnywhere();
        expect(pushState).not.toHaveBeenCalled();
    });

    it("pushes again after the sentinel was used up on desktop", () => {
        const { rerender } = render(<LayoutHarness layout="phone" />);
        pressAnywhere();
        expect(pushState).toHaveBeenCalledTimes(1);

        rerender(<LayoutHarness layout="desktop" />);
        // A back press with no listener takes the sentinel off
        pressBack();
        expect(pushState).toHaveBeenCalledTimes(1);

        rerender(<LayoutHarness layout="phone" />);
        pressAnywhere();
        expect(pushState).toHaveBeenCalledTimes(2);
    });

    it("registers into a context value built by hand", () => {
        const stack = new BackStack();
        const doesHandleBack = vi.fn(() => true);
        renderHook(
            () => useBackHandler(true, BACK_LEVELS.settings, doesHandleBack),
            {
                wrapper: ({ children }: { children: ReactNode }) => (
                    <BackStackContext
                        value={{
                            stack,
                            releaseSentinel: vi.fn(),
                            dropSentinel: vi.fn()
                        }}
                    >
                        {children}
                    </BackStackContext>
                )
            }
        );

        expect(stack.handleBack()).toBe(true);
        expect(doesHandleBack).toHaveBeenCalledWith(stack);
    });

    it("does nothing on desktop or without a provider", () => {
        const doesHandleBack = vi.fn(() => true);
        const { result } = renderHook(
            () => {
                useBackHandler(true, BACK_LEVELS.transient, doesHandleBack);
                return useBackStack();
            },
            { wrapper: createWrapper("desktop") }
        );
        expect(result.current).toBeNull();
        pressAnywhere();
        pressBack();

        expect(() =>
            renderHook(() =>
                useBackHandler(true, BACK_LEVELS.transient, doesHandleBack)
            )
        ).not.toThrow();
        pressAnywhere();
        pressBack();

        expect(pushState).not.toHaveBeenCalled();
        expect(doesHandleBack).not.toHaveBeenCalled();
    });
});
