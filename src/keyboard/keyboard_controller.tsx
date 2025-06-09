import type { AudioEngine } from "../core_backend/audio_engine.ts";
import "./keyboard_controller.css";
import { Keyboard } from "./keyboard/keyboard.tsx";
import { useEffect, useState } from "react";
import { midiControllers } from "spessasynth_core";
import { ControllerKnob } from "./controller_knob/controller_knob.tsx";
import { KEYBOARD_TARGET_CHANNEL } from "./target_channel.ts";

const INITIAL_CC_LIST: number[] = [
    midiControllers.modulationWheel,
    midiControllers.mainVolume,
    midiControllers.pan,
    midiControllers.expressionController,
    midiControllers.sustainPedal,
    midiControllers.filterResonance,
    midiControllers.brightness,

    midiControllers.reverbDepth,
    midiControllers.chorusDepth
];

export function KeyboardController({ engine }: { engine: AudioEngine }) {
    const channel = engine.processor.midiAudioChannels[KEYBOARD_TARGET_CHANNEL];
    const [controllers, setControllers] = useState(INITIAL_CC_LIST);
    const [controllerValues, setControllerValues] = useState<number[]>(
        INITIAL_CC_LIST.map((cc) => channel.midiControllers[cc] >> 7)
    );

    useEffect(() => {
        setControllerValues(
            controllers.map((cc) => channel.midiControllers[cc] >> 7)
        );
    }, [channel.midiControllers, controllers]);

    useEffect(() => {
        engine.processor.onEventCall = (e, d) => {
            if (
                e === "controllerchange" &&
                d?.channel === KEYBOARD_TARGET_CHANNEL
            ) {
                const ccV = d.controllerValue;
                const ccTarget = controllers.findIndex(
                    (c) => c === d.controllerNumber
                );
                if (ccTarget >= 0) {
                    const newValues = [...controllerValues];
                    newValues[ccTarget] = ccV;
                    setControllerValues(newValues);
                }
            }
        };
    }, [controllerValues, controllers, engine.processor]);

    return (
        <div className={"keyboard_controller"}>
            <Keyboard engine={engine}></Keyboard>
            <div className={"controller_row"}>
                {controllers.map((cc, i) => {
                    const setCC = (cc: number) => {
                        const newControllers = [...controllers];
                        newControllers[i] = cc;
                        setControllers(newControllers);
                    };
                    const setCCValue = (v: number) => {
                        engine.processor.controllerChange(
                            KEYBOARD_TARGET_CHANNEL,
                            cc,
                            v
                        );
                    };
                    return (
                        <ControllerKnob
                            cc={cc}
                            ccValue={controllerValues[i]}
                            setCCValue={setCCValue}
                            setCC={setCC}
                            key={i}
                        ></ControllerKnob>
                    );
                })}
            </div>
        </div>
    );
}
