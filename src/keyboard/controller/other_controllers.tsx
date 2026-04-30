import { type Ref, useCallback, useImperativeHandle, useState } from "react";
import { ControllerRange } from "../../fancy_inputs/controller_range/controller_range.tsx";
import { useTranslation } from "react-i18next";
import { KEYBOARD_TARGET_CHANNEL } from "../target_channel.ts";
import { modulatorSources } from "spessasynth_core";
import { useAudioEngine } from "../../core_backend/audio_engine_context.ts";

export interface OtherCCRef {
    setPitch: (pitch: number) => void;
    setPressure: (pressure: number) => void;
}

export function OtherControllers({ ref }: { ref: Ref<OtherCCRef> }) {
    const {
        audioEngine: { processor }
    } = useAudioEngine();
    const [pitchValue, sp] = useState(
        processor.midiChannels[KEYBOARD_TARGET_CHANNEL].midiControllers[
            128 + modulatorSources.pitchWheel
        ]
    );
    const [pressure, spres] = useState(
        processor.midiChannels[KEYBOARD_TARGET_CHANNEL].midiControllers[
            128 + modulatorSources.channelPressure
        ] >> 7
    );
    const { t } = useTranslation();

    const setPitchValue = useCallback(
        (v: number) => {
            v = Math.floor(v);
            // event callback will update the range
            processor.pitchWheel(KEYBOARD_TARGET_CHANNEL, v);
        },
        [processor]
    );

    const setPressureValue = useCallback(
        (v: number) => {
            v = Math.floor(v);
            processor.channelPressure(KEYBOARD_TARGET_CHANNEL, v);
        },
        [processor]
    );

    useImperativeHandle(ref, () => ({
        setPitch(pitch: number) {
            sp(pitch);
        },
        setPressure(pressure: number) {
            spres(pressure);
        }
    }));

    const midiPanic = useCallback(() => {
        processor.stopAllChannels(true);
    }, [processor]);

    const systemReset = useCallback(() => {
        midiPanic();
        processor.resetAllControllers();
    }, [midiPanic, processor]);

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
                    max={16_383}
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
