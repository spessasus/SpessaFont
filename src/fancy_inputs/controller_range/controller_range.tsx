import "./controller_range.css";
import { useState } from "react";
import type { ControllerProps } from "../controller_knob/controller_knob.tsx";

/**
 * Jumps larger than this (in percent) animate, so dragging stays responsive.
 */
const TRANSITION_THRESHOLD = 5;

interface ControllerRangeProps extends ControllerProps {
    text: string;
}

export function ControllerRange({
    min,
    max,
    value,
    onChange,
    text
}: ControllerRangeProps) {
    const percent = Math.round(((value - min) / (max - min)) * 100);
    const [previousPercent, setPreviousPercent] = useState(percent);
    const [isJump, setIsJump] = useState(false);
    if (previousPercent !== percent) {
        setPreviousPercent(percent);
        setIsJump(Math.abs(previousPercent - percent) > TRANSITION_THRESHOLD);
    }

    return (
        <label className="controller_range_wrapper">
            <span className={"monospaced"}>{text}</span>
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
                    value={value}
                    onChange={(e) => onChange(Number.parseInt(e.target.value))}
                />
            </div>
        </label>
    );
}
