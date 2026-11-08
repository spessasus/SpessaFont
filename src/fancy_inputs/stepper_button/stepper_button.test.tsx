// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen
} from "@testing-library/react";
import { StepperButton } from "./stepper_button.tsx";

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

function renderStepper(steps = 1, isDisabled = false) {
    vi.useFakeTimers();
    const onStep = vi.fn();
    const view = render(
        <StepperButton
            isDisabled={isDisabled}
            label="Step"
            onStep={onStep}
            steps={steps}
        >
            +
        </StepperButton>
    );
    return {
        onStep,
        button: screen.getByRole("button", { name: "Step" }),
        view
    };
}

function advance(ms: number) {
    act(() => {
        vi.advanceTimersByTime(ms);
    });
}

describe("StepperButton", () => {
    it("steps on a press and repeats from 400 ms every 100 ms while held", () => {
        const { onStep, button } = renderStepper();
        fireEvent.pointerDown(button);
        expect(onStep).toHaveBeenCalledTimes(1);
        advance(399);
        expect(onStep).toHaveBeenCalledTimes(1);
        advance(1);
        expect(onStep).toHaveBeenCalledTimes(2);
        advance(100);
        expect(onStep).toHaveBeenCalledTimes(3);
        fireEvent.pointerUp(button);
        advance(1000);
        expect(onStep).toHaveBeenCalledTimes(3);
    });

    it("passes its step count", () => {
        const { onStep, button } = renderStepper(10);
        fireEvent.pointerDown(button);
        expect(onStep).toHaveBeenCalledWith(10);
    });

    it("stops on pointer leave, cancel and unmount, and when disabled", () => {
        const first = renderStepper();
        fireEvent.pointerDown(first.button);
        fireEvent.pointerLeave(first.button);
        advance(1000);
        expect(first.onStep).toHaveBeenCalledTimes(1);
        cleanup();

        const second = renderStepper();
        fireEvent.pointerDown(second.button);
        fireEvent.pointerCancel(second.button);
        advance(1000);
        expect(second.onStep).toHaveBeenCalledTimes(1);
        cleanup();

        const third = renderStepper();
        fireEvent.pointerDown(third.button);
        third.view.unmount();
        advance(1000);
        expect(third.onStep).toHaveBeenCalledTimes(1);
        cleanup();

        const fourth = renderStepper(1, true);
        fireEvent.pointerDown(fourth.button);
        advance(1000);
        expect(fourth.onStep).not.toHaveBeenCalled();
        expect(fourth.button.getAttribute("aria-disabled")).toBe("true");
    });

    it("steps on a keyboard click but not on the click after a press", () => {
        const { onStep, button } = renderStepper();
        fireEvent.click(button, { detail: 0 });
        expect(onStep).toHaveBeenCalledTimes(1);
        fireEvent.pointerDown(button);
        fireEvent.pointerUp(button);
        fireEvent.click(button, { detail: 1 });
        expect(onStep).toHaveBeenCalledTimes(2);
    });

    it("stops a hold when it becomes disabled", () => {
        const { onStep, button, view } = renderStepper();
        fireEvent.pointerDown(button);
        view.rerender(
            <StepperButton isDisabled label="Step" onStep={onStep} steps={1}>
                +
            </StepperButton>
        );
        advance(1000);
        expect(onStep).toHaveBeenCalledTimes(1);
    });

    it("ignores non-primary mouse buttons", () => {
        const { onStep, button } = renderStepper();
        fireEvent.pointerDown(button, { pointerType: "mouse", button: 2 });
        expect(onStep).not.toHaveBeenCalled();
    });
});
