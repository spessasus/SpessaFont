import { midiControllers } from "spessasynth_core";
import "./controller_knob.css";
import {
    CC_TOGGLES,
    MODULABLE_CCS
} from "../../core_backend/midi_constants.ts";
import { useTranslation } from "react-i18next";
import { getCCLocale } from "../../locale/get_cc_locale.ts";
import * as React from "react";
import { type JSX, useMemo, useRef } from "react";

const MIN_DEG = 40;
const MAX_DEG = 320;

export function ControllerKnob({
    cc,
    setCC,
    ccValue,
    setCCValue
}: {
    cc: midiControllers;
    setCC: (cc: midiControllers) => void;
    ccValue: number;
    setCCValue: (v: number) => void;
}) {
    const isMouseDownRef = useRef(false);

    const releaseMouse = () => {
        isMouseDownRef.current = false;
    };
    const pressMouse = () => {
        isMouseDownRef.current = true;
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

    const { t } = useTranslation();
    const isToggle = useMemo(() => CC_TOGGLES.includes(cc), [cc]);
    const ccLocales = useMemo(
        () => MODULABLE_CCS.map((cc) => getCCLocale(cc, t)),
        [t]
    );

    const toggleCC = () => {
        if (ccValue >= 64) {
            setCCValue(0);
        } else {
            setCCValue(127);
        }
    };

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
            <select
                className={"pretty_input monospaced"}
                style={{
                    fontSize: "1rem",
                    width: "9ch"
                }}
                value={cc}
                onChange={(e) =>
                    setCC(
                        parseInt(e.target.value) ||
                            midiControllers.modulationWheel
                    )
                }
            >
                {MODULABLE_CCS.map((cc) => {
                    return (
                        <option key={cc} value={cc}>
                            {"CC#" +
                                cc.toString().padEnd(5, "\u00A0") +
                                " - " +
                                ccLocales[cc]}
                        </option>
                    );
                })}
            </select>
            {knobElement}
            <p className={"monospaced"}>{ccValue}</p>
        </div>
    );
}
