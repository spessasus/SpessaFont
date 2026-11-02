import type * as React from "react";
import "./controller_knob.css";

const MIN_DEG = 40;
const MAX_DEG = 320;

export interface ControllerProps {
    min: number;
    max: number;
    value: number;
    onChange: (v: number) => unknown;
}

interface ControllerKnobProps extends ControllerProps {
    label: string;
}

export function ControllerKnob({
    min,
    max,
    onChange,
    value,
    label
}: ControllerKnobProps) {
    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        // The knob captures the pointer while it is held, so a drag can leave the knob
        if (!el.hasPointerCapture(e.pointerId)) {
            return;
        }
        const rect = el.getBoundingClientRect();
        const radius = rect.width / 2;
        const x = e.clientX - rect.left - radius;
        const y = e.clientY - rect.top - radius;
        let angleDeg = Math.atan2(y, x) * (180 / Math.PI);
        angleDeg = (angleDeg + 270) % 360;
        angleDeg = Math.max(MIN_DEG, Math.min(MAX_DEG, angleDeg));
        const normalizedValue = (angleDeg - MIN_DEG) / (MAX_DEG - MIN_DEG);
        onChange(normalizedValue * (max - min) + min);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const steps: Partial<Record<string, number>> = {
            ArrowUp: value + 1,
            ArrowRight: value + 1,
            ArrowDown: value - 1,
            ArrowLeft: value - 1,
            Home: min,
            End: max
        };
        const next = steps[e.key];
        if (next === undefined) {
            return;
        }
        e.preventDefault();
        onChange(Math.max(min, Math.min(max, next)));
    };

    const normalizedValue = (value - min) / (max - min);

    return (
        <div className={"controller_knob_wrapper"}>
            <div
                role={"slider"}
                tabIndex={0}
                aria-label={label}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={value}
                onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    handlePointerMove(e);
                }}
                onPointerMove={handlePointerMove}
                onKeyDown={handleKeyDown}
                className={"controller_knob"}
                style={{
                    transform: `rotate(${normalizedValue * (MAX_DEG - MIN_DEG) + MIN_DEG}deg)`
                }}
            >
                <div className={"knob_head"}></div>
            </div>
            <span className={"monospaced"}>{value}</span>
        </div>
    );
}
