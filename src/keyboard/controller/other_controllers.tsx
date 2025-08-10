import type { AudioEngine } from "../../core_backend/audio_engine.ts";
import { type Ref, useImperativeHandle, useState } from "react";
import { ControllerRange } from "../../fancy_inputs/controller_range/controller_range.tsx";
import { useTranslation } from "react-i18next";
import { KEYBOARD_TARGET_CHANNEL } from "../target_channel.ts";
import { modulatorSources } from "spessasynth_core";

export interface OtherCCRef {
    setPitch: (pitch: number) => void;
    setPressure: (pressure: number) => void;
}

export function OtherControllers({
    engine,
    ref
}: {
    engine: AudioEngine;
    ref: Ref<OtherCCRef>;
}) {
    const [pitchValue, sp] = useState(
        engine.processor.midiChannels[KEYBOARD_TARGET_CHANNEL].midiControllers[
            128 + modulatorSources.pitchWheel
        ]
    );
    const [pressure, spres] = useState(
        engine.processor.midiChannels[KEYBOARD_TARGET_CHANNEL].midiControllers[
            128 + modulatorSources.channelPressure
        ] >> 7
    );
    const { t } = useTranslation();

    const setPitchValue = (v: number) => {
        v = Math.floor(v);
        // event callback will update the range
        engine.processor.pitchWheel(KEYBOARD_TARGET_CHANNEL, v);
    };

    const setPressureValue = (v: number) => {
        v = Math.floor(v);
        engine.processor.channelPressure(KEYBOARD_TARGET_CHANNEL, v);
    };

    useImperativeHandle(ref, () => ({
        setPitch(pitch: number) {
            sp(pitch);
        },
        setPressure(pressure: number) {
            spres(pressure);
        }
    }));

    const midiPanic = () => {
        engine.processor.stopAllChannels(true);
    };

    const systemReset = () => {
        midiPanic();
        engine.processor.resetAllControllers();
    };

    return (
        <div className={"controller_row"}>
            <div className={"controller_column"}>
                <div
                    onClick={midiPanic}
                    className={
                        "pretty_button responsive_button hover_brightness monospaced"
                    }
                >
                    {t("keyboardLocale.midiPanic")}
                </div>
                <div
                    onClick={systemReset}
                    className={
                        "pretty_button responsive_button hover_brightness monospaced"
                    }
                >
                    {t("keyboardLocale.resetSynthesizer")}
                </div>
            </div>
            <div className={"controller_column"}>
                <ControllerRange
                    text={t("modulatorLocale.sources.pitchWheel")}
                    max={16383}
                    min={0}
                    onChange={setPitchValue}
                    value={pitchValue}
                ></ControllerRange>
                <span className={"monospaced"}>{pitchValue - 8192}</span>
            </div>
            <div className={"controller_column"}>
                <ControllerRange
                    text={t("modulatorLocale.sources.channelPressure")}
                    max={127}
                    min={0}
                    onChange={setPressureValue}
                    value={pressure}
                ></ControllerRange>
                <span className={"monospaced"}>{pressure}</span>
            </div>
        </div>
    );
}
