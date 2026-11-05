import { type MIDIController, MIDIControllers } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import "./controller.css";
import { CC_TOGGLES } from "../../utils/midi_constants.ts";
import { ControllerKnob } from "../../fancy_inputs/controller_knob/controller_knob.tsx";
import { KEYBOARD_TARGET_CHANNEL } from "../target_channel.ts";
import { ControllerSwitch } from "../../fancy_inputs/controller_switch/controller_switch.tsx";
import { useAudioEngine } from "../../core_backend/audio_engine_context.ts";
import { OptionList } from "../../utils/translated_options/option_list.tsx";
import { useTranslatedOptions } from "../../utils/translated_options/translated_options_context.ts";
import { useSynthValue } from "../../hooks/use_synth_value.ts";

interface ControllerProps {
    cc: MIDIController;
    onCCChange: (cc: MIDIController) => void;
    /**
     * The 1-based slot number, for the labels.
     */
    number: number;
}

export function Controller({ cc, onCCChange, number }: ControllerProps) {
    const { t } = useTranslation();
    const { controllers } = useTranslatedOptions();
    const { audioEngine } = useAudioEngine();
    // The synth stores 14-bit values, the knob shows the 7-bit MSB
    const ccValue = useSynthValue(
        (channel) => (channel.controllers[cc] ?? 0) >> 7
    );
    const valueLabel = t("keyboardLocale.controllerValue", { number });

    // The synth event updates the shown value
    const setCCValue = (v: number) =>
        audioEngine.ccChangeRealTime(
            KEYBOARD_TARGET_CHANNEL,
            cc,
            Math.floor(v)
        );

    return (
        <div className={"controller_wrapper"}>
            <select
                className={"pretty_input monospaced controller_select"}
                aria-label={t("keyboardLocale.controller", { number })}
                value={cc}
                onChange={(e) =>
                    onCCChange(
                        (Number.parseInt(e.target.value) as MIDIController) ||
                            MIDIControllers.modulationWheel
                    )
                }
            >
                <OptionList options={controllers} />
            </select>
            {CC_TOGGLES.includes(cc) ? (
                <div className={"controller_knob_wrapper"}>
                    <ControllerSwitch
                        label={valueLabel}
                        onChange={(isOn) => setCCValue(isOn ? 127 : 0)}
                        value={ccValue >= 64}
                    />
                    <span className={"monospaced"}>{ccValue}</span>
                </div>
            ) : (
                <ControllerKnob
                    label={valueLabel}
                    max={127}
                    min={0}
                    onChange={setCCValue}
                    value={ccValue}
                />
            )}
        </div>
    );
}
