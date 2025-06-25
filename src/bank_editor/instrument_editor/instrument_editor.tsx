import type { AudioEngine } from "../../core_backend/audio_engine.ts";
import {
    type BasicInstrument,
    BasicPreset,
    generatorTypes
} from "spessasynth_core";
import "./instrument_editor.css";
import { useEffect } from "react";
import { KEYBOARD_TARGET_CHANNEL } from "../../keyboard/target_channel.ts";
import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";
import type { SetViewType } from "../bank_editor.tsx";
import { useTranslation } from "react-i18next";
import { NumberGeneratorRow } from "../generator_view/generator_row.tsx";
import { WaitingInput } from "../../fancy_inputs/waiting_input/waiting_input.tsx";
import {
    ac2hz,
    cb2db,
    db2cb,
    hz2ac,
    s2tc,
    tc2s
} from "../conversion_helpers.ts";
import { LinkedPresets } from "./linked_presets/linked_presets.tsx";

type InstrumentEditorProps = {
    manager: SoundBankManager;
    instrument: BasicInstrument;
    engine: AudioEngine;
    setView: SetViewType;
    setInstruments: (s: BasicInstrument[]) => void;
    instruments: BasicInstrument[];
};

export function InstrumentEditor({
    engine,
    instrument,
    manager,
    setInstruments,
    instruments,
    setView
}: InstrumentEditorProps) {
    const { t } = useTranslation();
    // do some hacky stuff to get the soundBankElement to play
    useEffect(() => {
        // sort zones
        instrument.instrumentZones.sort(
            (z1, z2) => z1.keyRange.min - z2.keyRange.min
        );

        engine.processor.clearCache();
        const preset = new BasicPreset(manager.bank);
        // screaming name so it's easier to spot errors
        preset.presetName = "INSTRUMENT PLAYBACK PRESET";
        preset.createZone().setInstrument(instrument);
        engine.processor.midiAudioChannels[KEYBOARD_TARGET_CHANNEL].setPreset(
            preset
        );
        return () => {
            preset.deletePreset();
            engine.processor.clearCache();
            engine.processor.programChange(KEYBOARD_TARGET_CHANNEL, 0);
        };
    }, [engine.processor, instrument, manager.bank]);
    return (
        <div className={"instrument_editor"}>
            <div className={"zone_table_wrapper"}>
                <table className={"zone_table"}>
                    <thead>
                        <tr className={"header_row"}>
                            <th className={"header_cell"}>
                                <WaitingInput
                                    type={"text"}
                                    value={instrument.instrumentName}
                                    setValue={(v) => {
                                        instrument.instrumentName = v;
                                        setInstruments([...instruments]);
                                        return v;
                                    }}
                                    maxLength={40}
                                />
                            </th>
                            <th className={"header_cell"}>
                                {t("soundBankLocale.globalZone")}
                            </th>
                            {instrument.instrumentZones.map((z, i) => (
                                <th
                                    className={"header_cell"}
                                    key={i}
                                    onClick={() => setView(z.sample)}
                                >
                                    {z.sample.sampleName}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <NumberGeneratorRow
                            soundBankElement={instrument}
                            generator={generatorTypes.keyRange}
                        />
                        <NumberGeneratorRow
                            soundBankElement={instrument}
                            generator={generatorTypes.velRange}
                        />

                        <NumberGeneratorRow
                            // lovely emu attenuation correction
                            fromGenerator={(v) => v * 0.04}
                            toGenerator={(v) => v / 0.04}
                            soundBankElement={instrument}
                            generator={generatorTypes.initialAttenuation}
                            unit="dB"
                            precision={2}
                        />

                        <NumberGeneratorRow
                            generator={generatorTypes.pan}
                            soundBankElement={instrument}
                            unit="pan"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.sampleModes}
                            soundBankElement={instrument}
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.overridingRootKey}
                            soundBankElement={instrument}
                        />
                        <NumberGeneratorRow
                            highlight={true}
                            generator={generatorTypes.coarseTune}
                            soundBankElement={instrument}
                        />
                        <NumberGeneratorRow
                            highlight={true}
                            generator={generatorTypes.fineTune}
                            soundBankElement={instrument}
                        />
                        <NumberGeneratorRow
                            highlight={true}
                            generator={generatorTypes.scaleTuning}
                            soundBankElement={instrument}
                            unit="cent"
                        />
                        <NumberGeneratorRow
                            fromGenerator={ac2hz}
                            toGenerator={hz2ac}
                            generator={generatorTypes.initialFilterFc}
                            soundBankElement={instrument}
                            unit="Hz"
                        />
                        <NumberGeneratorRow
                            fromGenerator={cb2db}
                            toGenerator={db2cb}
                            precision={1}
                            generator={generatorTypes.initialFilterQ}
                            soundBankElement={instrument}
                            unit="dB"
                        />
                        <NumberGeneratorRow
                            highlight={true}
                            fromGenerator={tc2s}
                            toGenerator={s2tc}
                            precision={3}
                            generator={generatorTypes.delayVolEnv}
                            soundBankElement={instrument}
                            unit="sec"
                        />
                        <NumberGeneratorRow
                            highlight={true}
                            fromGenerator={tc2s}
                            toGenerator={s2tc}
                            precision={3}
                            generator={generatorTypes.attackVolEnv}
                            soundBankElement={instrument}
                            unit="sec"
                        />
                        <NumberGeneratorRow
                            highlight={true}
                            fromGenerator={tc2s}
                            toGenerator={s2tc}
                            precision={3}
                            generator={generatorTypes.holdVolEnv}
                            soundBankElement={instrument}
                            unit="sec"
                        />
                        <NumberGeneratorRow
                            highlight={true}
                            fromGenerator={tc2s}
                            toGenerator={s2tc}
                            precision={3}
                            generator={generatorTypes.decayVolEnv}
                            soundBankElement={instrument}
                            unit="sec"
                        />
                        <NumberGeneratorRow
                            highlight={true}
                            generator={generatorTypes.sustainVolEnv}
                            fromGenerator={cb2db}
                            toGenerator={db2cb}
                            soundBankElement={instrument}
                            unit="dB"
                            precision={1}
                        />
                        <NumberGeneratorRow
                            highlight={true}
                            fromGenerator={tc2s}
                            toGenerator={s2tc}
                            precision={3}
                            generator={generatorTypes.releaseVolEnv}
                            soundBankElement={instrument}
                            unit="sec"
                        />
                        <NumberGeneratorRow
                            highlight={true}
                            generator={generatorTypes.keyNumToVolEnvHold}
                            soundBankElement={instrument}
                            unit="cent"
                        />
                        <NumberGeneratorRow
                            highlight={true}
                            generator={generatorTypes.keyNumToVolEnvDecay}
                            soundBankElement={instrument}
                            unit="cent"
                        />
                        <NumberGeneratorRow
                            fromGenerator={tc2s}
                            toGenerator={s2tc}
                            precision={3}
                            generator={generatorTypes.delayModEnv}
                            soundBankElement={instrument}
                            unit="sec"
                        />
                        <NumberGeneratorRow
                            fromGenerator={tc2s}
                            toGenerator={s2tc}
                            precision={3}
                            generator={generatorTypes.attackModEnv}
                            soundBankElement={instrument}
                            unit="sec"
                        />
                        <NumberGeneratorRow
                            fromGenerator={tc2s}
                            toGenerator={s2tc}
                            precision={3}
                            generator={generatorTypes.holdModEnv}
                            soundBankElement={instrument}
                            unit="sec"
                        />
                        <NumberGeneratorRow
                            fromGenerator={tc2s}
                            toGenerator={s2tc}
                            precision={3}
                            generator={generatorTypes.decayModEnv}
                            soundBankElement={instrument}
                            unit="sec"
                        />
                        <NumberGeneratorRow
                            fromGenerator={(v) => v / 10}
                            toGenerator={(v) => v * 10}
                            precision={1}
                            generator={generatorTypes.sustainModEnv}
                            soundBankElement={instrument}
                            unit="dB"
                        />
                        <NumberGeneratorRow
                            fromGenerator={tc2s}
                            toGenerator={s2tc}
                            precision={3}
                            generator={generatorTypes.releaseModEnv}
                            soundBankElement={instrument}
                            unit="sec"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.modEnvToFilterFc}
                            soundBankElement={instrument}
                            unit="cent"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.modEnvToPitch}
                            soundBankElement={instrument}
                            unit="cent"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.keyNumToModEnvHold}
                            soundBankElement={instrument}
                            unit="cent"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.keyNumToModEnvDecay}
                            soundBankElement={instrument}
                            unit="cent"
                        />
                        <NumberGeneratorRow
                            highlight={true}
                            fromGenerator={tc2s}
                            toGenerator={s2tc}
                            precision={3}
                            generator={generatorTypes.delayModLFO}
                            soundBankElement={instrument}
                            unit="sec"
                        />
                        <NumberGeneratorRow
                            highlight={true}
                            fromGenerator={ac2hz}
                            toGenerator={hz2ac}
                            precision={3}
                            generator={generatorTypes.freqModLFO}
                            soundBankElement={instrument}
                            unit="Hz"
                        />
                        <NumberGeneratorRow
                            highlight={true}
                            generator={generatorTypes.modLfoToPitch}
                            soundBankElement={instrument}
                            unit="cent"
                        />
                        <NumberGeneratorRow
                            highlight={true}
                            generator={generatorTypes.modLfoToFilterFc}
                            soundBankElement={instrument}
                            unit="cent"
                        />
                        <NumberGeneratorRow
                            highlight={true}
                            fromGenerator={cb2db}
                            toGenerator={db2cb}
                            precision={1}
                            generator={generatorTypes.modLfoToVolume}
                            soundBankElement={instrument}
                            unit="dB"
                        />
                        <NumberGeneratorRow
                            fromGenerator={tc2s}
                            toGenerator={s2tc}
                            precision={3}
                            generator={generatorTypes.delayVibLFO}
                            soundBankElement={instrument}
                            unit="sec"
                        />
                        <NumberGeneratorRow
                            fromGenerator={ac2hz}
                            toGenerator={hz2ac}
                            precision={3}
                            generator={generatorTypes.freqVibLFO}
                            soundBankElement={instrument}
                            unit="Hz"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.vibLfoToPitch}
                            soundBankElement={instrument}
                            unit="cent"
                        />
                        <NumberGeneratorRow
                            highlight={true}
                            generator={generatorTypes.exclusiveClass}
                            soundBankElement={instrument}
                        />
                        <NumberGeneratorRow
                            highlight={true}
                            fromGenerator={(v) => v / 10}
                            toGenerator={(v) => v * 10}
                            precision={1}
                            generator={generatorTypes.chorusEffectsSend}
                            soundBankElement={instrument}
                            unit="percent"
                        />
                        <NumberGeneratorRow
                            highlight={true}
                            fromGenerator={(v) => v / 10}
                            toGenerator={(v) => v * 10}
                            precision={1}
                            generator={generatorTypes.reverbEffectsSend}
                            soundBankElement={instrument}
                            unit="percent"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.keyNum}
                            soundBankElement={instrument}
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.velocity}
                            soundBankElement={instrument}
                        />
                    </tbody>
                </table>
            </div>
            <LinkedPresets
                instrument={instrument}
                manager={manager}
                setInstruments={setInstruments}
                setView={setView}
            />
        </div>
    );
}
