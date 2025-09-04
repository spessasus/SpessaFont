import { type MIDIController, midiControllers } from "spessasynth_core";
import "./controller.css";
import { CC_TOGGLES } from "../../utils/midi_constants.ts";
import {
    type JSX,
    type Ref,
    useImperativeHandle,
    useMemo,
    useState
} from "react";
import { ControllerKnob } from "../../fancy_inputs/controller_knob/controller_knob.tsx";
import type { AudioEngine } from "../../core_backend/audio_engine.ts";
import { KEYBOARD_TARGET_CHANNEL } from "../target_channel.ts";
import { ControllerSwitch } from "../../fancy_inputs/controller_switch/controller_switch.tsx";

export interface ControllerKnobRef {
    ccUpdate(c: number, value: number): void;
}

function ControllerWrapper({
    engine,
    cc,
    ref
}: {
    engine: AudioEngine;
    cc: MIDIController;
    ref: Ref<ControllerKnobRef>;
}) {
    const [ccValue, sv] = useState(
        engine.processor.midiChannels[KEYBOARD_TARGET_CHANNEL].midiControllers[
            cc
        ] >> 7
    );
    const isToggle = useMemo(() => CC_TOGGLES.includes(cc), [cc]);

    const setCCValue = (v: number) => {
        // event callback will update the knob
        engine.processor.controllerChange(
            KEYBOARD_TARGET_CHANNEL,
            cc,
            Math.floor(v)
        );
    };

    const toggleCC = (v: boolean) => {
        if (!v) {
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
            <div className={"controller_knob_wrapper"}>
                <ControllerSwitch
                    onChange={toggleCC}
                    value={ccValue >= 64}
                ></ControllerSwitch>
                <span className={"monospaced"}>{ccValue}</span>
            </div>
        );
    } else {
        knobElement = (
            <ControllerKnob
                max={127}
                min={0}
                onChange={setCCValue}
                value={ccValue}
            ></ControllerKnob>
        );
    }
    return knobElement;
}

export function Controller({
    cc,
    setCC,
    engine,
    ccOptions,
    ref
}: {
    cc: MIDIController;
    setCC: (cc: MIDIController) => void;
    engine: AudioEngine;
    ref: Ref<ControllerKnobRef>;
    ccOptions: JSX.Element;
}) {
    return (
        <div className={"controller_wrapper"}>
            <select
                className={"pretty_input monospaced"}
                style={{
                    fontSize: "1rem",
                    width: "9ch"
                }}
                value={cc}
                onChange={(e) =>
                    setCC(
                        (parseInt(e.target.value) as MIDIController) ||
                            midiControllers.modulationWheel
                    )
                }
            >
                {ccOptions}
            </select>
            <ControllerWrapper
                cc={cc}
                engine={engine}
                ref={ref}
            ></ControllerWrapper>
        </div>
    );
}
