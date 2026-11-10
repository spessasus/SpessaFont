// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, renderHook } from "@testing-library/react";
import { LayoutContext } from "../layout/layout_context.ts";
import type { LayoutMode } from "../layout/layout_setting.ts";
import { BackStackProvider } from "../phone_shell/back_stack_provider.tsx";
import {
    BackStackContext,
    useBackStack
} from "../phone_shell/back_stack_context.ts";
import { BACK_LEVELS, BackStack } from "../phone_shell/back_stack.ts";
import { setUpFakeHistory } from "../test_utils/fake_history.ts";
import type { FakeHistory } from "../test_utils/fake_history.ts";
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

describe("useBackHandler", () => {
    let fakeHistory: FakeHistory;
    beforeEach(() => {
        fakeHistory = setUpFakeHistory();
    });
    afterEach(() => {
        cleanup();
        fakeHistory.restore();
    });

    it("pushes the sentinel on the first pointerup, runs on popstate and pushes again", () => {
        const doesHandleBack = vi.fn(() => true);
        renderHook(
            () => useBackHandler(true, BACK_LEVELS.transient, doesHandleBack),
            {
                wrapper: createWrapper("phone")
            }
        );
        expect(fakeHistory.pushState).not.toHaveBeenCalled();

        fakeHistory.pressAnywhere();
        expect(fakeHistory.pushState).toHaveBeenCalledWith(
            { spessafont: "back" },
            ""
        );
        fakeHistory.pressAnywhere();
        expect(fakeHistory.pushState).toHaveBeenCalledTimes(1);

        fakeHistory.popState();
        expect(doesHandleBack).toHaveBeenCalledTimes(1);
        expect(fakeHistory.pushState).toHaveBeenCalledTimes(2);
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

        fakeHistory.pressAnywhere();
        fakeHistory.popState();
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

        fakeHistory.pressAnywhere();
        fakeHistory.popState();
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

        fakeHistory.pressAnywhere();
        fakeHistory.popState();
        expect(doesHandleBack).toHaveBeenCalledTimes(1);
        expect(fakeHistory.pushState).toHaveBeenCalledTimes(1);

        // Any press cancels the release
        fakeHistory.pressAnywhere();
        expect(fakeHistory.pushState).toHaveBeenCalledTimes(2);

        act(() => {
            result.current?.dropSentinel();
        });
        expect(fakeHistory.back).toHaveBeenCalledTimes(1);
        // The popstate history.back() causes is ignored
        fakeHistory.popState();
        expect(doesHandleBack).toHaveBeenCalledTimes(1);
        expect(fakeHistory.pushState).toHaveBeenCalledTimes(2);

        // Without a sentinel there is nothing to drop
        act(() => {
            result.current?.dropSentinel();
        });
        expect(fakeHistory.back).toHaveBeenCalledTimes(1);
    });

    it("does not push a second sentinel after a reload on one", () => {
        fakeHistory.setState({ spessafont: "back" });
        renderHook(() => useBackStack(), { wrapper: createWrapper("phone") });

        fakeHistory.pressAnywhere();
        expect(fakeHistory.pushState).not.toHaveBeenCalled();
    });

    it("pushes again after the sentinel was used up on desktop", () => {
        const { rerender } = render(<LayoutHarness layout="phone" />);
        fakeHistory.pressAnywhere();
        expect(fakeHistory.pushState).toHaveBeenCalledTimes(1);

        rerender(<LayoutHarness layout="desktop" />);
        // A back press with no listener takes the sentinel off
        fakeHistory.popState();
        expect(fakeHistory.pushState).toHaveBeenCalledTimes(1);

        rerender(<LayoutHarness layout="phone" />);
        fakeHistory.pressAnywhere();
        expect(fakeHistory.pushState).toHaveBeenCalledTimes(2);
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
        fakeHistory.pressAnywhere();
        fakeHistory.popState();

        expect(() =>
            renderHook(() =>
                useBackHandler(true, BACK_LEVELS.transient, doesHandleBack)
            )
        ).not.toThrow();
        fakeHistory.pressAnywhere();
        fakeHistory.popState();

        expect(fakeHistory.pushState).not.toHaveBeenCalled();
        expect(doesHandleBack).not.toHaveBeenCalled();
    });
});
