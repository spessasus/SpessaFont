import { useEffect, useRef } from "react";
import type { MouseEvent, PointerEvent, ReactNode } from "react";
import "./stepper_button.css";

export const STEPPER_DELAY_MS = 400;
export const STEPPER_REPEAT_MS = 100;

interface StepperButtonProps {
    label: string;
    steps: number;
    onStep: (steps: number) => void;
    isDisabled?: boolean;
    children: ReactNode;
}

export function StepperButton({
    label,
    steps,
    onStep,
    isDisabled = false,
    children
}: StepperButtonProps) {
    const timers = useRef({
        delay: undefined as ReturnType<typeof setTimeout> | undefined,
        repeat: undefined as ReturnType<typeof setInterval> | undefined
    });

    // Held repeats must call the latest handler, as the caller's value changes between steps
    const latest = useRef({ onStep, steps });
    useEffect(() => {
        latest.current = { onStep, steps };
    });

    const stop = () => {
        clearTimeout(timers.current.delay);
        clearInterval(timers.current.repeat);
        timers.current.delay = undefined;
        timers.current.repeat = undefined;
    };

    useEffect(() => stop, []);

    // A hold in progress must end when the button becomes disabled
    useEffect(() => {
        if (isDisabled) {
            stop();
        }
    }, [isDisabled]);

    const handlePointerDown = (event: PointerEvent) => {
        if (
            isDisabled ||
            (event.pointerType === "mouse" && event.button !== 0)
        ) {
            return;
        }
        stop();
        onStep(steps);
        timers.current.delay = setTimeout(() => {
            latest.current.onStep(latest.current.steps);
            timers.current.repeat = setInterval(() => {
                latest.current.onStep(latest.current.steps);
            }, STEPPER_REPEAT_MS);
        }, STEPPER_DELAY_MS);
    };

    const handleClick = (event: MouseEvent) => {
        // A pointer press already stepped, only a keyboard click has no detail
        if (!isDisabled && event.detail === 0) {
            onStep(steps);
        }
    };

    return (
        <button
            aria-disabled={isDisabled ? true : undefined}
            aria-label={label}
            className="pretty_button stepper_button"
            onClick={handleClick}
            onContextMenu={(event) => {
                event.preventDefault();
            }}
            onPointerCancel={stop}
            onPointerDown={handlePointerDown}
            onPointerLeave={stop}
            onPointerUp={stop}
            type="button"
        >
            {children}
        </button>
    );
}
