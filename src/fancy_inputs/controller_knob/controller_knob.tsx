import * as React from "react";
import { useRef } from "react";
import "./controller_knob.css";

const MIN_DEG = 40;
const MAX_DEG = 320;

export interface ControllerProps {
    min: number;
    max: number;
    value: number;
    onChange: (v: number) => unknown;
}

export function ControllerKnob({ min, max, onChange, value }: ControllerProps) {
    const isMouseDownRef = useRef(false);

    const releaseMouse = () => {
        isMouseDownRef.current = false;
    };
    const pressMouse = (e: React.MouseEvent<HTMLDivElement>) => {
        isMouseDownRef.current = true;
        moveHandler(e);
    };

    const moveHandler = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isMouseDownRef.current) {
            return;
        }
        const el = e.currentTarget as HTMLDivElement;
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

    const normalizedValue = (value - min) / (max - min);

    return (
        <div className={"controller_knob_wrapper"}>
            <div
                onMouseLeave={releaseMouse}
                onMouseUp={releaseMouse}
                onMouseDown={pressMouse}
                onMouseMove={moveHandler}
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
