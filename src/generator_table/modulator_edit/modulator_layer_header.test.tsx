// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ModulatorLayerHeader } from "./modulator_layer_header.tsx";
import { BackStack, BACK_LEVELS } from "../../phone_shell/back_stack.ts";
import { BackStackContext } from "../../phone_shell/back_stack_context.ts";

afterEach(cleanup);

describe("ModulatorLayerHeader", () => {
    it("closes the layer on back and on its arrow", () => {
        const stack = new BackStack();
        const onBack = vi.fn();
        const { unmount } = render(
            <BackStackContext
                value={{
                    stack,
                    releaseSentinel: vi.fn(),
                    dropSentinel: vi.fn()
                }}
            >
                <ModulatorLayerHeader title={"T"} onBack={onBack} />
            </BackStackContext>
        );

        expect(screen.getByRole("heading", { name: "T" })).toBeTruthy();
        expect(stack.hasActive([BACK_LEVELS.modulatorLayer])).toBe(true);

        expect(stack.handleBack()).toBe(true);
        expect(onBack).toHaveBeenCalledTimes(1);

        fireEvent.click(
            screen.getByRole("button", {
                name: "phoneLocale.modulators.back"
            })
        );
        expect(onBack).toHaveBeenCalledTimes(2);

        unmount();
        expect(stack.hasActive([BACK_LEVELS.modulatorLayer])).toBe(false);
    });
});
