import { type BasicPreset, generatorTypes } from "spessasynth_core";
import "./preset_editor.css";
import type { AudioEngine } from "../../core_backend/audio_engine.ts";
import { KEYBOARD_TARGET_CHANNEL } from "../../keyboard/target_channel.ts";
import { WaitingInput } from "../../fancy_inputs/waiting_input/waiting_input.tsx";
import type { SetViewType } from "../bank_editor.tsx";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { NumberGeneratorRow } from "../generator_view/generator_row.tsx";
import { cb2db, db2cb } from "../conversion_helpers.ts";

export function PresetEditor({
    preset,
    engine,
    presets,
    setPresets,
    setView
}: {
    preset: BasicPreset;
    engine: AudioEngine;
    presets: BasicPreset[];
    setPresets: (p: BasicPreset[]) => unknown;
    setView: SetViewType;
}) {
    const { t } = useTranslation();
    useEffect(() => {
        engine.processor.midiAudioChannels[KEYBOARD_TARGET_CHANNEL].setPreset(
            preset
        );
    }, [engine.processor, preset]);

    return (
        <div className={"preset_editor"}>
            <div className={"zone_table_wrapper"}>
                <table className={"zone_table"}>
                    <thead>
                        <tr className={"header_row"}>
                            <th className={"header_cell"}>
                                <WaitingInput
                                    type={"text"}
                                    value={preset.presetName}
                                    setValue={(v) => {
                                        preset.presetName = v;
                                        setPresets([...presets]);
                                        return v;
                                    }}
                                    maxLength={40}
                                />
                            </th>
                            <th className={"header_cell"}>
                                {t("soundBankLocale.globalZone")}
                            </th>
                            {preset.presetZones.map((z, i) => (
                                <th
                                    className={"header_cell"}
                                    key={i}
                                    onClick={() => setView(z.instrument)}
                                >
                                    {z.instrument.instrumentName}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        <NumberGeneratorRow
                            soundBankElement={preset}
                            generator={generatorTypes.keyRange}
                        />
                        <NumberGeneratorRow
                            soundBankElement={preset}
                            generator={generatorTypes.velRange}
                        />

                        <NumberGeneratorRow
                            // lovely emu attenuation correction
                            fromGenerator={(v) => v * 0.04}
                            toGenerator={(v) => v / 0.04}
                            soundBankElement={preset}
                            generator={generatorTypes.initialAttenuation}
                            unit="dB"
                            precision={2}
                        />

                        <NumberGeneratorRow
                            generator={generatorTypes.pan}
                            soundBankElement={preset}
                            unit="pan"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.coarseTune}
                            soundBankElement={preset}
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.fineTune}
                            soundBankElement={preset}
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.scaleTuning}
                            soundBankElement={preset}
                            unit="centPerKey"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.initialFilterFc}
                            soundBankElement={preset}
                            unit="acent"
                        />
                        <NumberGeneratorRow
                            fromGenerator={cb2db}
                            toGenerator={db2cb}
                            precision={1}
                            generator={generatorTypes.initialFilterQ}
                            soundBankElement={preset}
                            unit="dB"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.delayVolEnv}
                            soundBankElement={preset}
                            unit="tcent"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.attackVolEnv}
                            soundBankElement={preset}
                            unit="tcent"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.holdVolEnv}
                            soundBankElement={preset}
                            unit="tcent"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.decayVolEnv}
                            soundBankElement={preset}
                            unit="tcent"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.sustainVolEnv}
                            fromGenerator={cb2db}
                            toGenerator={db2cb}
                            soundBankElement={preset}
                            unit="dB"
                            precision={1}
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.releaseVolEnv}
                            soundBankElement={preset}
                            unit="tcent"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.keyNumToVolEnvHold}
                            soundBankElement={preset}
                            unit="cent"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.keyNumToVolEnvDecay}
                            soundBankElement={preset}
                            unit="cent"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.delayModEnv}
                            soundBankElement={preset}
                            unit="tcent"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.attackModEnv}
                            soundBankElement={preset}
                            unit="tcent"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.holdModEnv}
                            soundBankElement={preset}
                            unit="tcent"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.decayModEnv}
                            soundBankElement={preset}
                            unit="tcent"
                        />
                        <NumberGeneratorRow
                            fromGenerator={(v) => v / 10}
                            toGenerator={(v) => v * 10}
                            precision={1}
                            generator={generatorTypes.sustainModEnv}
                            soundBankElement={preset}
                            unit="dB"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.releaseModEnv}
                            soundBankElement={preset}
                            unit="tcent"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.modEnvToFilterFc}
                            soundBankElement={preset}
                            unit="cent"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.modEnvToPitch}
                            soundBankElement={preset}
                            unit="cent"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.keyNumToModEnvHold}
                            soundBankElement={preset}
                            unit="cent"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.keyNumToModEnvDecay}
                            soundBankElement={preset}
                            unit="cent"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.delayModLFO}
                            soundBankElement={preset}
                            unit="tcent"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.freqModLFO}
                            soundBankElement={preset}
                            unit="acent"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.modLfoToPitch}
                            soundBankElement={preset}
                            unit="cent"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.modLfoToFilterFc}
                            soundBankElement={preset}
                            unit="cent"
                        />
                        <NumberGeneratorRow
                            fromGenerator={cb2db}
                            toGenerator={db2cb}
                            precision={1}
                            generator={generatorTypes.modLfoToVolume}
                            soundBankElement={preset}
                            unit="dB"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.delayVibLFO}
                            soundBankElement={preset}
                            unit="tcent"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.freqVibLFO}
                            soundBankElement={preset}
                            unit="acent"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.vibLfoToPitch}
                            soundBankElement={preset}
                            unit="cent"
                        />
                        <NumberGeneratorRow
                            fromGenerator={(v) => v / 10}
                            toGenerator={(v) => v * 10}
                            precision={1}
                            generator={generatorTypes.chorusEffectsSend}
                            soundBankElement={preset}
                            unit="percent"
                        />
                        <NumberGeneratorRow
                            fromGenerator={(v) => v / 10}
                            toGenerator={(v) => v * 10}
                            precision={1}
                            generator={generatorTypes.reverbEffectsSend}
                            soundBankElement={preset}
                            unit="percent"
                        />
                    </tbody>
                </table>
            </div>
        </div>
    );
}
