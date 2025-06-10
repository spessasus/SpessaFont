import { midiControllers } from "spessasynth_core";
import "./controller.css";
import {
    CC_TOGGLES,
    MODULABLE_CCS
} from "../../core_backend/midi_constants.ts";
import { useTranslation } from "react-i18next";
import { getCCLocale } from "../../locale/get_cc_locale.ts";
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

export type ControllerKnobRef = {
    ccUpdate(c: number, value: number): void;
};

function ControllerWrapper({
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
    ref
}: {
    cc: midiControllers;
    setCC: (cc: midiControllers) => void;
    engine: AudioEngine;
    ref: Ref<ControllerKnobRef>;
}) {
    const { t } = useTranslation();
    const ccLocales = useMemo(
        () => MODULABLE_CCS.map((cc) => getCCLocale(cc, t)),
        [t]
    );

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
            <ControllerWrapper
                cc={cc}
                engine={engine}
                ref={ref}
            ></ControllerWrapper>
        </div>
    );
}
