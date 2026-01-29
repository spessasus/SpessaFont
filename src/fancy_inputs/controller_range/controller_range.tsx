import "./controller_range.css";
import { useEffect, useRef } from "react";
import type { ControllerProps } from "../controller_knob/controller_knob.tsx";

export function ControllerRange({
    min,
    max,
    value,
    onChange,
    text
}: ControllerProps & { text: string }) {
    const visualWrapperRef = useRef<HTMLDivElement>(null);
    const previousValueRef = useRef<number>(value);

    useEffect(() => {
        const visualWrapper = visualWrapperRef.current;
        if (!visualWrapper) {
            return;
        }

        const oldVal = previousValueRef.current;
        const newVal = Math.round(((value - min) / (max - min)) * 100);

        const oldPercent = Math.round(((oldVal - min) / (max - min)) * 100);

        visualWrapper.classList.toggle(
            "controller_range_transition",
            Math.abs(oldPercent - newVal) > 5
        );

        visualWrapper.style.setProperty("--visual-width", `${newVal}%`);
        previousValueRef.current = value;
    }, [value, min, max]);

    return (
        <div className="controller_range_wrapper">
            <span className={"monospaced"}>{text}</span>
            <div
                className="controller_range_visual_wrapper"
                ref={visualWrapperRef}
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
        </div>
    );
}
