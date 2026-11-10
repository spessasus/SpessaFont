import "./controller_phone.css";
import { ControllerRange } from "../../fancy_inputs/controller_range/controller_range.tsx";
import { useTranslation } from "react-i18next";
import { KEYBOARD_TARGET_CHANNEL } from "../target_channel.ts";
import { useAudioEngine } from "../../core_backend/audio_engine_context.ts";
import { useSynthValue } from "../../hooks/use_synth_value.ts";

const PITCH_WHEEL_CENTER = 8192;

export function OtherControllers() {
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();
    const pitchWheel = useSynthValue((channel) => channel.pitchWheel);
    const pressure = useSynthValue((channel) => channel.pressure);

    const handleMIDIPanic = () => audioEngine.stopAllNotes();

    const handleSystemReset = () => audioEngine.resetSynthesizer();

    return (
        <div className={"controller_row"}>
            <div className={"controller_column"}>
                <button
                    type={"button"}
                    onClick={handleMIDIPanic}
                    className={
                        "pretty_button responsive_button hover_brightness monospaced"
                    }
                >
                    {t("keyboardLocale.midiPanic")}
                </button>
                <button
                    type={"button"}
                    onClick={handleSystemReset}
                    className={
                        "pretty_button responsive_button hover_brightness monospaced"
                    }
                >
                    {t("keyboardLocale.resetSynthesizer")}
                </button>
            </div>
            <div className={"controller_column"}>
                <ControllerRange
                    text={t("modulatorLocale.sources.pitchWheel")}
                    max={16_383}
                    min={0}
                    // The synth event updates the slider
                    onChange={(v) =>
                        audioEngine.pitchWheel(
                            KEYBOARD_TARGET_CHANNEL,
                            Math.floor(v)
                        )
                    }
                    value={pitchWheel}
                />
                <span className={"monospaced"}>
                    {pitchWheel - PITCH_WHEEL_CENTER}
                </span>
            </div>
            <div className={"controller_column"}>
                <ControllerRange
                    text={t("modulatorLocale.sources.channelPressure")}
                    max={127}
                    min={0}
                    onChange={(v) =>
                        audioEngine.channelPressure(
                            KEYBOARD_TARGET_CHANNEL,
                            Math.floor(v)
                        )
                    }
                    value={pressure}
                />
                <span className={"monospaced"}>{pressure}</span>
            </div>
        </div>
    );
}
