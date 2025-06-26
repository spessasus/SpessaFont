import type { AudioEngine } from "../core_backend/audio_engine.ts";
import "./keyboard_controller.css";
import { Keyboard, type KeyboardPressRef } from "./keyboard/keyboard.tsx";
import * as React from "react";
import { type JSX, type RefObject, useEffect, useRef, useState } from "react";
import { midiControllers } from "spessasynth_core";
import {
    Controller,
    type ControllerKnobRef
} from "./controller/controller.tsx";
import { KEYBOARD_TARGET_CHANNEL } from "./target_channel.ts";
import {
    type OtherCCRef,
    OtherControllers
} from "./controller/other_controllers.tsx";

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

export function KeyboardController({
    engine,
    ccOptions
}: {
    engine: AudioEngine;
    ccOptions: JSX.Element;
}) {
    const [controllers, setControllers] = useState(INITIAL_CC_LIST);
    const knobRefs = useRef<RefObject<ControllerKnobRef | null>[]>([]);
    INITIAL_CC_LIST.map(() => {
        const reference = React.createRef<ControllerKnobRef>();
        knobRefs.current.push(reference);
    });

    const pitchRef = useRef<OtherCCRef>(null);
    const keyboardRef = useRef<KeyboardPressRef>(null);

    useEffect(() => {
        engine.processor.onEventCall = (e, d) => {
            if (d?.channel === KEYBOARD_TARGET_CHANNEL) {
                switch (e) {
                    case "controllerchange": {
                        const ccV = d.controllerValue;
                        const cc = d.controllerNumber;
                        knobRefs.current.forEach((r) => {
                            r?.current?.ccUpdate(cc, ccV);
                        });
                        break;
                    }

                    case "stopall":
                        keyboardRef?.current?.clearAll();
                        break;

                    case "noteon":
                        keyboardRef?.current?.pressNote(d?.midiNote || 60);
                        break;

                    case "noteoff":
                        keyboardRef?.current?.releaseNote(d?.midiNote || 60);
                        break;

                    case "pitchwheel":
                        {
                            const pitch = (d.MSB << 7) | d.LSB;
                            pitchRef?.current?.setPitch(pitch);
                        }
                        break;

                    case "channelpressure": {
                        pitchRef?.current?.setPressure(d.pressure);
                    }
                }
            }
        };
    }, [controllers, engine.processor]);

    return (
        <div className={"keyboard_controller"}>
            <Keyboard ref={keyboardRef} engine={engine}></Keyboard>
            <div className={"controller_row_scroll"}>
                <div className={"controller_row controller_row_main"}>
                    <OtherControllers
                        engine={engine}
                        ref={pitchRef}
                    ></OtherControllers>

                    <div className={"controller_row"}>
                        {controllers.map((cc, i) => {
                            const setCC = (cc: number) => {
                                const newControllers = [...controllers];
                                newControllers[i] = cc;
                                setControllers(newControllers);
                            };
                            return (
                                <Controller
                                    ccOptions={ccOptions}
                                    cc={cc}
                                    engine={engine}
                                    setCC={setCC}
                                    key={i}
                                    ref={knobRefs.current[i]}
                                ></Controller>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
