import type { AudioEngine } from "../../core_backend/audio_engine.ts";
import type { midiControllers } from "spessasynth_core";
import * as React from "react";
import {
    type JSX,
    type Ref,
    useImperativeHandle,
    useMemo,
    useRef,
    useState
} from "react";
import { KEYBOARD_TARGET_CHANNEL } from "../target_channel.ts";
import { CC_TOGGLES } from "../../core_backend/midi_constants.ts";

export type ControllerKnobRef = {
    ccUpdate(c: number, value: number): void;
};

const MIN_DEG = 40;
const MAX_DEG = 320;

export function ControllerKnob({
    engine,
    cc,
    ref
}: {
    engine: AudioEngine;
    cc: midiControllers;
    ref: Ref<ControllerKnobRef>;
}) {
    const [ccValue, sv] = useState(
        engine.processor.midiAudioChannels[KEYBOARD_TARGET_CHANNEL]
            .midiControllers[cc] >> 7
    );
    const isToggle = useMemo(() => CC_TOGGLES.includes(cc), [cc]);
    const isMouseDownRef = useRef(false);

    const releaseMouse = () => {
        isMouseDownRef.current = false;
    };
    const pressMouse = () => {
        isMouseDownRef.current = true;
    };

    const setCCValue = (v: number) => {
        // event callback will update the knob
        engine.processor.controllerChange(KEYBOARD_TARGET_CHANNEL, cc, v);
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
        const ccValue = Math.floor(
            ((angleDeg - MIN_DEG) / (MAX_DEG - MIN_DEG)) * 127
        );
        setCCValue(ccValue);
    };
    const toggleCC = () => {
        if (ccValue >= 64) {
            setCCValue(0);
        } else {
            setCCValue(127);
        }
    };

    useImperativeHandle(ref, () => ({
        // event callback actually updates the knob
        ccUpdate(c: number, value: number) {
            if (c === cc) {
                sv(value);
            }
        }
    }));

    let knobElement: JSX.Element;
    if (isToggle) {
        knobElement = (
            <div className={"controller_switch_wrapper"}>
                <div
                    className={
                        "controller_switch" + (ccValue >= 63 ? " active" : "")
                    }
                    onClick={toggleCC}
                >
                    <span className="switch_slider"></span>
                </div>
            </div>
        );
    } else {
        knobElement = (
            <div
                onMouseLeave={releaseMouse}
                onMouseUp={releaseMouse}
                onMouseDown={pressMouse}
                onMouseMove={moveHandler}
                className={"controller_knob"}
                style={{
                    transform: `rotate(${(ccValue / 127) * (MAX_DEG - MIN_DEG) + MIN_DEG}deg)`
                }}
            >
                <div className={"knob_head"}></div>
            </div>
        );
    }

    return (
        <div className={"controller_knob_wrapper"}>
            {knobElement}
            <p className={"monospaced"}>{ccValue}</p>
        </div>
    );
}
