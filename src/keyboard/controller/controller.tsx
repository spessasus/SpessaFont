import { type MIDIController, midiControllers } from "spessasynth_core";
import "./controller.css";
import { CC_TOGGLES } from "../../utils/midi_constants.ts";
import {
    type JSX,
    type Ref,
    useCallback,
    useImperativeHandle,
    useMemo,
    useState
} from "react";
import { ControllerKnob } from "../../fancy_inputs/controller_knob/controller_knob.tsx";
import { KEYBOARD_TARGET_CHANNEL } from "../target_channel.ts";
import { ControllerSwitch } from "../../fancy_inputs/controller_switch/controller_switch.tsx";
import { useAudioEngine } from "../../core_backend/audio_engine_context.ts";

export interface ControllerKnobRef {
    ccUpdate(c: number, value: number): void;
}

function ControllerWrapper({
    cc,
    ref
}: {
    cc: MIDIController;
    ref: Ref<ControllerKnobRef>;
}) {
    const { audioEngine } = useAudioEngine();
    const [ccValue, sv] = useState(
        audioEngine.processor.midiChannels[KEYBOARD_TARGET_CHANNEL]
            .midiControllers[cc] >> 7
    );
    const isToggle = useMemo(() => CC_TOGGLES.includes(cc), [cc]);

    const setCCValue = useCallback(
        (v: number) => {
            // event callback will update the knob
            audioEngine.ccChangeRealTime(
                KEYBOARD_TARGET_CHANNEL,
                cc,
                Math.floor(v)
            );
        },
        [audioEngine, cc]
    );

    const toggleCC = useCallback(
        (v: boolean) => {
            if (v) {
                setCCValue(127);
            } else {
                setCCValue(0);
            }
        },
        [setCCValue]
    );

    useImperativeHandle(ref, () => ({
        // event callback actually updates the knob
        ccUpdate(c: number, value: number) {
            if (c === cc) {
                sv(value);
            }
        }
    }));

    return isToggle ? (
        <div className={"controller_knob_wrapper"}>
            <ControllerSwitch
                onChange={toggleCC}
                value={ccValue >= 64}
            ></ControllerSwitch>
            <span className={"monospaced"}>{ccValue}</span>
        </div>
    ) : (
        <ControllerKnob
            max={127}
            min={0}
            onChange={setCCValue}
            value={ccValue}
        ></ControllerKnob>
    );
}

export function Controller({
    cc,
    setCC,
    ccOptions,
    ref
}: {
    cc: MIDIController;
    setCC: (cc: MIDIController) => void;
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
                        (Number.parseInt(e.target.value) as MIDIController) ||
                            midiControllers.modulationWheel
                    )
                }
            >
                {ccOptions}
            </select>
            <ControllerWrapper cc={cc} ref={ref}></ControllerWrapper>
        </div>
    );
}
