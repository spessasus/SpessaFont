import type { AudioEngine } from "../core_backend/audio_engine.ts";
import "./keyboard_controller.css";
import { Keyboard } from "./keyboard/keyboard.tsx";
import * as React from "react";
import { type JSX, type RefObject, useEffect, useRef, useState } from "react";
import { midiControllers } from "spessasynth_core";
import {
    Controller,
    type ControllerKnobRef
} from "./controller/controller.tsx";
import { KEYBOARD_TARGET_CHANNEL } from "./target_channel.ts";
import { ControllerRange } from "../fancy_inputs/controller_range/controller_range.tsx";
import { useTranslation } from "react-i18next";

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
    const [val, setVal] = useState(0);
    const { t } = useTranslation();
    const knobRefs = useRef<RefObject<ControllerKnobRef | null>[]>([]);
    INITIAL_CC_LIST.map(() => {
        const reference = React.createRef<ControllerKnobRef>();
        knobRefs.current.push(reference);
    });
    useEffect(() => {
        engine.processor.onEventCall = (e, d) => {
            if (
                e === "controllerchange" &&
                d?.channel === KEYBOARD_TARGET_CHANNEL
            ) {
                const ccV = d.controllerValue;
                const cc = d.controllerNumber;
                knobRefs.current.forEach((r) => {
                    r?.current?.ccUpdate(cc, ccV);
                });
            }
        };
    }, [controllers, engine.processor]);

    return (
        <div className={"keyboard_controller"}>
            <Keyboard engine={engine}></Keyboard>
            <div className={"controller_row"}>
                <ControllerRange
                    text={t("modulatorLocale.sources.pitchWheel")}
                    max={100}
                    min={-100}
                    onChange={(e) => setVal(e)}
                    value={val}
                ></ControllerRange>
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
    );
}
