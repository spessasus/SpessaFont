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
import { NumberGeneratorRow } from "./generator_view/generator_row.tsx";
import { WaitingInput } from "../../fancy_inputs/waiting_input/waiting_input.tsx";

type InstrumentEditorProps = {
    manager: SoundBankManager;
    instrument: BasicInstrument;
    engine: AudioEngine;
    setView: SetViewType;
    setInstruments: (s: BasicInstrument[]) => void;
    instruments: BasicInstrument[];
};

// helper conversion functions
const tc2s = (c: number) => Math.pow(2, c / 1200);
const s2tc = (s: number) => (1200 * Math.log(s)) / Math.log(2);
const cb2db = (c: number) => c / 10;
const db2cb = (d: number) => d * 10;
const ac2hz = (c: number) => 440 * Math.pow(2, (c - 6900) / 1200);
const hz2ac = (h: number) => 6900 + (1200 * Math.log(h / 440)) / Math.log(2);

export function InstrumentEditor({
    engine,
    instrument,
    manager,
    setInstruments,
    instruments,
    setView
}: InstrumentEditorProps) {
    const { t } = useTranslation();
    // do some hacky stuff to get the instrument to play
    useEffect(() => {
        engine.processor.clearCache();
        const preset = new BasicPreset(manager.bank);
        preset.createZone().setInstrument(instrument);
        engine.processor.midiAudioChannels[KEYBOARD_TARGET_CHANNEL].setPreset(
            preset
        );
        return () => {
            engine.processor.clearCache();
            engine.processor.programChange(KEYBOARD_TARGET_CHANNEL, 0);
        };
    }, [engine.processor, instrument, manager.bank]);
    return (
        <div className={"instrument_editor"}>
            <div className={"zones_view_wrapper"}>
                <table className={"zones_view"}>
                    <thead>
                        <tr className={"header_row"}>
                            <th className={"header_cell"}>
                                <WaitingInput
                                    type={"text"}
                                    value={instrument.instrumentName}
                                    setValue={(v) => {
                                        console.log(v);
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
                            instrument={instrument}
                            generator={generatorTypes.keyRange}
                        />
                        <NumberGeneratorRow
                            instrument={instrument}
                            generator={generatorTypes.velRange}
                        />

                        <NumberGeneratorRow
                            // lovely emu attenuation correction
                            fromGenerator={(v) => v * 0.04}
                            toGenerator={(v) => v / 0.04}
                            instrument={instrument}
                            generator={generatorTypes.initialAttenuation}
                            suffix="dB"
                            precision={2}
                        />

                        <NumberGeneratorRow
                            generator={generatorTypes.pan}
                            instrument={instrument}
                            suffix="[-500;500]"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.sampleModes}
                            instrument={instrument}
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.overridingRootKey}
                            instrument={instrument}
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.coarseTune}
                            instrument={instrument}
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.fineTune}
                            instrument={instrument}
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.scaleTuning}
                            instrument={instrument}
                            suffix="ct"
                        />
                        <NumberGeneratorRow
                            fromGenerator={ac2hz}
                            toGenerator={hz2ac}
                            generator={generatorTypes.initialFilterFc}
                            instrument={instrument}
                            suffix="Hz"
                        />
                        <NumberGeneratorRow
                            fromGenerator={cb2db}
                            toGenerator={db2cb}
                            precision={1}
                            generator={generatorTypes.initialFilterQ}
                            instrument={instrument}
                            suffix="dB"
                        />
                        <NumberGeneratorRow
                            fromGenerator={tc2s}
                            toGenerator={s2tc}
                            precision={3}
                            generator={generatorTypes.delayVolEnv}
                            instrument={instrument}
                            suffix="s"
                        />
                        <NumberGeneratorRow
                            fromGenerator={tc2s}
                            toGenerator={s2tc}
                            precision={3}
                            generator={generatorTypes.attackVolEnv}
                            instrument={instrument}
                            suffix="s"
                        />
                        <NumberGeneratorRow
                            fromGenerator={tc2s}
                            toGenerator={s2tc}
                            precision={3}
                            generator={generatorTypes.holdVolEnv}
                            instrument={instrument}
                            suffix="s"
                        />
                        <NumberGeneratorRow
                            fromGenerator={tc2s}
                            toGenerator={s2tc}
                            precision={3}
                            generator={generatorTypes.decayVolEnv}
                            instrument={instrument}
                            suffix="s"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.sustainVolEnv}
                            fromGenerator={cb2db}
                            toGenerator={db2cb}
                            instrument={instrument}
                            suffix="dB"
                            precision={1}
                        />
                        <NumberGeneratorRow
                            fromGenerator={tc2s}
                            toGenerator={s2tc}
                            precision={3}
                            generator={generatorTypes.releaseVolEnv}
                            instrument={instrument}
                            suffix="s"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.keyNumToVolEnvHold}
                            instrument={instrument}
                            suffix="ct"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.keyNumToVolEnvDecay}
                            instrument={instrument}
                            suffix="ct"
                        />
                        <NumberGeneratorRow
                            fromGenerator={tc2s}
                            toGenerator={s2tc}
                            precision={3}
                            generator={generatorTypes.delayModEnv}
                            instrument={instrument}
                            suffix="s"
                        />
                        <NumberGeneratorRow
                            fromGenerator={tc2s}
                            toGenerator={s2tc}
                            precision={3}
                            generator={generatorTypes.attackModEnv}
                            instrument={instrument}
                            suffix="s"
                        />
                        <NumberGeneratorRow
                            fromGenerator={tc2s}
                            toGenerator={s2tc}
                            precision={3}
                            generator={generatorTypes.holdModEnv}
                            instrument={instrument}
                            suffix="s"
                        />
                        <NumberGeneratorRow
                            fromGenerator={tc2s}
                            toGenerator={s2tc}
                            precision={3}
                            generator={generatorTypes.decayModEnv}
                            instrument={instrument}
                            suffix="s"
                        />
                        <NumberGeneratorRow
                            fromGenerator={(v) => v / 10}
                            toGenerator={(v) => v * 10}
                            precision={1}
                            generator={generatorTypes.sustainModEnv}
                            instrument={instrument}
                            suffix="dB"
                        />
                        <NumberGeneratorRow
                            fromGenerator={tc2s}
                            toGenerator={s2tc}
                            precision={3}
                            generator={generatorTypes.releaseModEnv}
                            instrument={instrument}
                            suffix="s"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.modEnvToFilterFc}
                            instrument={instrument}
                            suffix="ct"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.modEnvToPitch}
                            instrument={instrument}
                            suffix="ct"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.keyNumToModEnvHold}
                            instrument={instrument}
                            suffix="ct"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.keyNumToModEnvDecay}
                            instrument={instrument}
                            suffix="ct"
                        />
                        <NumberGeneratorRow
                            fromGenerator={tc2s}
                            toGenerator={s2tc}
                            precision={3}
                            generator={generatorTypes.delayModLFO}
                            instrument={instrument}
                            suffix="s"
                        />
                        <NumberGeneratorRow
                            fromGenerator={ac2hz}
                            toGenerator={hz2ac}
                            precision={3}
                            generator={generatorTypes.freqModLFO}
                            instrument={instrument}
                            suffix="Hz"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.modLfoToPitch}
                            instrument={instrument}
                            suffix="ct"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.modLfoToFilterFc}
                            instrument={instrument}
                            suffix="ct"
                        />
                        <NumberGeneratorRow
                            fromGenerator={cb2db}
                            toGenerator={db2cb}
                            precision={1}
                            generator={generatorTypes.modLfoToVolume}
                            instrument={instrument}
                            suffix="dB"
                        />
                        <NumberGeneratorRow
                            fromGenerator={tc2s}
                            toGenerator={s2tc}
                            precision={3}
                            generator={generatorTypes.delayVibLFO}
                            instrument={instrument}
                            suffix="s"
                        />
                        <NumberGeneratorRow
                            fromGenerator={ac2hz}
                            toGenerator={hz2ac}
                            precision={3}
                            generator={generatorTypes.freqVibLFO}
                            instrument={instrument}
                            suffix="Hz"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.vibLfoToPitch}
                            instrument={instrument}
                            suffix="ct"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.exclusiveClass}
                            instrument={instrument}
                        />
                        <NumberGeneratorRow
                            fromGenerator={(v) => v / 10}
                            toGenerator={(v) => v * 10}
                            precision={1}
                            generator={generatorTypes.chorusEffectsSend}
                            instrument={instrument}
                            suffix="%"
                        />
                        <NumberGeneratorRow
                            fromGenerator={(v) => v / 10}
                            toGenerator={(v) => v * 10}
                            precision={1}
                            generator={generatorTypes.reverbEffectsSend}
                            instrument={instrument}
                            suffix="%"
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.keyNum}
                            instrument={instrument}
                        />
                        <NumberGeneratorRow
                            generator={generatorTypes.velocity}
                            instrument={instrument}
                        />
                    </tbody>
                </table>
            </div>
        </div>
    );
}
