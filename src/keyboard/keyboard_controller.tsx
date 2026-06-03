import "./keyboard_controller.css";
import { Keyboard, type KeyboardRef } from "./keyboard/keyboard.tsx";
import * as React from "react";
import { type JSX, type RefObject, useEffect, useRef, useState } from "react";
import {
    CONTROLLER_TABLE_SIZE,
    DEFAULT_MIDI_CONTROLLERS,
    type GenericRange,
    type MIDIController,
    MIDIControllers
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
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";

const INITIAL_CC_LIST: MIDIController[] = [
    MIDIControllers.modulationWheel,
    MIDIControllers.mainVolume,
    MIDIControllers.pan,
    MIDIControllers.expression,
    MIDIControllers.sustainPedal,
    MIDIControllers.filterResonance,
    MIDIControllers.brightness,

    MIDIControllers.reverbDepth,
    MIDIControllers.chorusDepth
];

export function KeyboardController({
    ccOptions,
    splits
}: {
    ccOptions: JSX.Element;
    splits: GenericRange[];
}) {
    const { t } = useTranslation();
    const {
        audioEngine: { processor }
    } = useAudioEngine();
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
        processor.onEventCall = (e) => {
            if (e.data) {
                switch (e.type) {
                    case "controllerChange": {
                        if (e.data?.channel !== KEYBOARD_TARGET_CHANNEL) return;
                        const ccV = e.data.value;
                        const cc = e.data.controller;
                        for (const r of knobRefs.current) {
                            r?.current?.ccUpdate(cc, ccV);
                        }
                        break;
                    }

                    case "reset": {
                        for (let i = 0; i < CONTROLLER_TABLE_SIZE; i++) {
                            for (const r of knobRefs.current) {
                                r?.current?.ccUpdate(
                                    i,
                                    DEFAULT_MIDI_CONTROLLERS[i] >> 7
                                );
                            }
                        }
                        break;
                    }

                    case "stopAll": {
                        keyboardRef?.current?.clearAll();
                        break;
                    }

                    case "noteOn": {
                        keyboardRef?.current?.pressNote(e.data.midiNote);
                        break;
                    }

                    case "noteOff": {
                        keyboardRef?.current?.releaseNote(e.data.midiNote);
                        break;
                    }

                    case "channelParamChange": {
                        if (e.data.channel !== KEYBOARD_TARGET_CHANNEL) return;
                        switch (e.data.parameter) {
                            case "pressure": {
                                pitchRef?.current?.setPressure(e.data.value);
                                break;
                            }

                            case "pitchWheel": {
                                pitchRef?.current?.setPitch(e.data.value);
                            }
                        }
                        break;
                    }
                }
            }
        };
    }, [controllers, processor, keyboardRef]);

    return (
        <div className={"keyboard_controller"}>
            <div className={"keyboard_controller_scroll"}>
                <Keyboard
                    ref={keyboardRef}
                    keyDisplay={keyDisplayRef}
                    velocityDisplay={velocityDisplayRef}
                    splits={splits}
                ></Keyboard>
                <div className={"controller_row_scroll"}>
                    <div className={"controller_row controller_row_main"}>
                        <OtherControllers ref={pitchRef}></OtherControllers>

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
        </div>
    );
}
