import "./controller_range.css";
import { useRef, useState } from "react";
import type { ControllerProps } from "../controller_knob/controller_knob.tsx";

/**
 * Jumps larger than this (in percent) animate, so dragging stays responsive.
 */
const TRANSITION_THRESHOLD = 5;
/**
 * The keys that move a range input, each ends one step.
 */
const STEP_KEYS = new Set([
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
    "PageUp",
    "PageDown"
]);

interface ControllerRangeProps extends ControllerProps {
    /**
     * The value line above the track, left out when there is none.
     */
    text?: string;
    step?: number;
    ariaLabel?: string;
    isDisabled?: boolean;
    /**
     * Called once when a drag ends with the pointer lifted, and after each key step, with the
     * value then. `onChange` still runs on every move.
     */
    onCommit?: (value: number) => void;
    /**
     * Called when the browser cancels a drag (a scroll or a rotation took the pointer).
     * `onCommit` does not run then.
     */
    onCancel?: () => void;
}

export function ControllerRange({
    min,
    max,
    value,
    onChange,
    text,
    step,
    ariaLabel,
    isDisabled,
    onCommit,
    onCancel
}: ControllerRangeProps) {
    // The value the input moved to last. The input is controlled, so by the time the pointer
    // lifts it may show the value prop again
    const movedValueRef = useRef<number | null>(null);
    const percent = Math.round(((value - min) / (max - min)) * 100);
    const [previousPercent, setPreviousPercent] = useState(percent);
    const [isJump, setIsJump] = useState(false);
    if (previousPercent !== percent) {
        setPreviousPercent(percent);
        setIsJump(Math.abs(previousPercent - percent) > TRANSITION_THRESHOLD);
    }

    return (
        <label className="controller_range_wrapper">
            {text === undefined ? null : (
                <span className={"monospaced"}>{text}</span>
            )}
            <div
                className={`controller_range_visual_wrapper ${isJump ? "controller_range_transition" : ""}`}
                style={{ "--visual-width": `${percent}%` }}
            >
                <div className="controller_range_progress" />
                <div className="controller_range_thumb" />
                <input
                    className="controller_range"
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    disabled={isDisabled}
                    aria-label={ariaLabel}
                    onChange={(e) => {
                        movedValueRef.current = Number(e.target.value);
                        onChange(movedValueRef.current);
                    }}
                    onPointerUp={
                        onCommit
                            ? (e) => {
                                  onCommit(
                                      movedValueRef.current ??
                                          Number(e.currentTarget.value)
                                  );
                                  movedValueRef.current = null;
                              }
                            : undefined
                    }
                    onPointerCancel={
                        onCancel
                            ? () => {
                                  movedValueRef.current = null;
                                  onCancel();
                              }
                            : undefined
                    }
                    onKeyUp={
                        onCommit
                            ? (e) => {
                                  if (!STEP_KEYS.has(e.key)) {
                                      return;
                                  }
                                  onCommit(
                                      movedValueRef.current ??
                                          Number(e.currentTarget.value)
                                  );
                                  movedValueRef.current = null;
                              }
                            : undefined
                    }
                />
            </div>
        </label>
    );
}
