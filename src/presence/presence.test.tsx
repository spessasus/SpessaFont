// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { LayoutContext } from "../layout/layout_context.ts";
import { setUpFakeHistory } from "../test_utils/fake_history.ts";
import type { FakeHistory } from "../test_utils/fake_history.ts";
import { BackStackProvider } from "../phone_shell/back_stack_provider.tsx";
import { BottomSheet } from "../phone_shell/bottom_sheet.tsx";
import { BACK_LEVELS } from "../phone_shell/back_stack.ts";
import { useBackHandler } from "../hooks/use_back_handler.ts";
import { usePresence } from "../hooks/use_presence.ts";
import { Presence } from "./presence.tsx";

interface LayerProps {
    onBack: () => void;
}

/**
 * A handler below the animated element, like the modulator layer's header.
 */
function LayerContent({ onBack }: LayerProps) {
    useBackHandler(true, BACK_LEVELS.modulatorLayer, () => {
        onBack();
        return true;
    });
    return <span>content</span>;
}

function Layer({ onBack }: LayerProps) {
    const { ref, isClosing } = usePresence<HTMLDivElement>();
    return (
        <div
            ref={ref}
            className={"layer"}
            data-state={isClosing ? "closing" : "open"}
        >
            <LayerContent onBack={onBack} />
        </div>
    );
}

function renderApp(isOpen: boolean, onBack: () => void) {
    return (
        <LayoutContext value={"phone"}>
            <BackStackProvider>
                <Presence>{isOpen ? <Layer onBack={onBack} /> : null}</Presence>
            </BackStackProvider>
        </LayoutContext>
    );
}

function renderSheet(isOpen: boolean) {
    return (
        <LayoutContext value={"phone"}>
            <BackStackProvider>
                <Presence>
                    {isOpen ? (
                        <BottomSheet title={"Menu"} onClose={() => undefined}>
                            <button type={"button"}>First</button>
                        </BottomSheet>
                    ) : null}
                </Presence>
            </BackStackProvider>
        </LayoutContext>
    );
}

describe("Presence", () => {
    let fakeHistory: FakeHistory;
    beforeEach(() => {
        fakeHistory = setUpFakeHistory();
        // jsdom loads no CSS, so every element gets an exit animation here
        const getStyle = getComputedStyle.bind(globalThis);
        vi.spyOn(globalThis, "getComputedStyle").mockImplementation(
            (element) => {
                const style = getStyle(element);
                Object.defineProperty(style, "animationName", {
                    value: "phone_test_out"
                });
                return style;
            }
        );
    });
    afterEach(() => {
        cleanup();
        fakeHistory.restore();
        vi.restoreAllMocks();
    });

    it("keeps a closed child until its exit animation ends", () => {
        const { rerender, container } = render(renderApp(true, vi.fn()));
        rerender(renderApp(false, vi.fn()));
        const layer = container.querySelector(".layer");
        expect(
            layer instanceof HTMLElement ? layer.dataset.state : undefined
        ).toBe("closing");
        act(() => {
            layer?.dispatchEvent(new Event("animationend"));
        });
        expect(container.querySelector(".layer")).toBeNull();
    });

    it("removes a closed child after the timeout without an animation end", () => {
        vi.useFakeTimers();
        try {
            const { rerender, container } = render(renderApp(true, vi.fn()));
            rerender(renderApp(false, vi.fn()));
            act(() => {
                vi.advanceTimersByTime(1000);
            });
            expect(container.querySelector(".layer")).toBeNull();
        } finally {
            vi.useRealTimers();
        }
    });

    it("passes a back press during the exit to what is under the child", () => {
        const onBack = vi.fn();
        const { rerender } = render(renderApp(true, onBack));
        rerender(renderApp(false, onBack));
        fakeHistory.pressBack();
        expect(onBack).not.toHaveBeenCalled();
    });

    it("focuses a bottom sheet again when it opens during its exit", () => {
        const opener = document.createElement("button");
        document.body.append(opener);
        opener.focus();

        const { rerender } = render(renderSheet(true));
        expect(document.activeElement?.textContent).toBe("First");
        rerender(renderSheet(false));
        expect(document.activeElement).toBe(opener);
        rerender(renderSheet(true));
        expect(document.activeElement?.textContent).toBe("First");
        opener.remove();
    });
});
