import type { AudioEngine } from "../core_backend/audio_engine.ts";
import "./keyboard_controller.css";
import { Keyboard, type KeyboardRef } from "./keyboard/keyboard.tsx";
import * as React from "react";
import { type JSX, type RefObject, useEffect, useRef, useState } from "react";
import {
    type GenericRange,
    type MIDIController,
    midiControllers
} from "spessasynth_core";
import {
    Controller,
    type ControllerKnobRef
} from "./controller/controller.tsx";
import { KEYBOARD_TARGET_CHANNEL } from "./target_channel.ts";
import {
    type OtherCCRef,
    OtherControllers
} from "./controller/other_controllers.tsx";
import { useTranslation } from "react-i18next";

const INITIAL_CC_LIST: MIDIController[] = [
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
    ccOptions,
    splits
}: {
    engine: AudioEngine;
    ccOptions: JSX.Element;
    splits: GenericRange[];
}) {
    const { t } = useTranslation();
    const [controllers, setControllers] =
        useState<MIDIController[]>(INITIAL_CC_LIST);
    const knobRefs = useRef<RefObject<ControllerKnobRef | null>[]>([]);
    INITIAL_CC_LIST.map(() => {
        const reference = React.createRef<ControllerKnobRef>();
        knobRefs.current.push(reference);
    });

    const pitchRef = useRef<OtherCCRef>(null);
    const keyDisplayRef = useRef<HTMLSpanElement>(null);
    const velocityDisplayRef = useRef<HTMLSpanElement>(null);
    const keyboardRef = useRef<KeyboardRef>(null);

    useEffect(() => {
        engine.processor.onEventCall = (e) => {
            if (
                e.data &&
                "channel" in e.data &&
                e.data?.channel === KEYBOARD_TARGET_CHANNEL
            ) {
                switch (e.type) {
                    case "controllerChange": {
                        const ccV = e.data.controllerValue;
                        const cc = e.data.controllerNumber;
                        knobRefs.current.forEach((r) => {
                            r?.current?.ccUpdate(cc, ccV);
                        });
                        break;
                    }

                    case "stopAll":
                        keyboardRef?.current?.clearAll();
                        break;

                    case "noteOn":
                        keyboardRef?.current?.pressNote(e.data.midiNote);
                        break;

                    case "noteOff":
                        keyboardRef?.current?.releaseNote(e.data.midiNote);
                        break;

                    case "pitchWheel":
                        pitchRef?.current?.setPitch(e.data.pitch);
                        break;

                    case "channelPressure": {
                        pitchRef?.current?.setPressure(e.data.pressure);
                    }
                }
            }
        };
    }, [controllers, engine.processor, keyboardRef]);

    return (
        <div className={"keyboard_controller"}>
            <Keyboard
                ref={keyboardRef}
                engine={engine}
                keyDisplay={keyDisplayRef}
                velocityDisplay={velocityDisplayRef}
                splits={splits}
            ></Keyboard>
            <div className={"controller_row_scroll"}>
                <div className={"controller_row controller_row_main"}>
                    <OtherControllers
                        engine={engine}
                        ref={pitchRef}
                    ></OtherControllers>

                    <div className={"controller_row"}>
                        {controllers.map((cc, i) => {
                            const setCC = (cc: MIDIController) => {
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

                    <div className={"controller_column"}>
                        <div>
                            <span>{t("keyboardLocale.midiKey")}</span>
                            <span
                                className={"monospaced number_display"}
                                ref={keyDisplayRef}
                            >
                                127
                            </span>
                        </div>

                        <div>
                            <span>{t("keyboardLocale.velocity")}</span>
                            <span
                                className={"monospaced number_display"}
                                ref={velocityDisplayRef}
                            >
                                127
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
