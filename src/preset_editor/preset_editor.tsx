import {
    type BasicPreset,
    type BasicPresetZone,
    generatorTypes
} from "spessasynth_core";
import "./preset_editor.css";
import type { AudioEngine } from "../core_backend/audio_engine.ts";
import { KEYBOARD_TARGET_CHANNEL } from "../keyboard/target_channel.ts";
import type { SetViewType } from "../bank_editor/bank_editor.tsx";
import { useEffect, useMemo } from "react";
import { cb2db, db2cb } from "../utils/conversion_helpers.ts";
import { BottomPresetBar } from "./bottom_bar/bottom_bar.tsx";
import type SoundBankManager from "../core_backend/sound_bank_manager.ts";
import type { GeneratorRowType } from "../instrument_editor/instrument_editor.tsx";
import { GeneratorTable } from "../generator_table/generator_table.tsx";

const presetRows: GeneratorRowType[] = [
    {
        generator: generatorTypes.keyRange
    },
    {
        generator: generatorTypes.velRange
    },
    {
        generator: generatorTypes.initialAttenuation,
        fromGenerator: (v) => v * 0.04,
        toGenerator: (v) => v / 0.04,
        unit: "dB",
        precision: 2
    },
    {
        generator: generatorTypes.pan,
        unit: "pan"
    },
    {
        generator: generatorTypes.coarseTune,
        highlight: true
    },
    {
        generator: generatorTypes.fineTune,
        highlight: true
    },
    {
        generator: generatorTypes.scaleTuning,
        highlight: true,
        unit: "cent"
    },
    {
        generator: generatorTypes.initialFilterFc,
        unit: "acent"
    },
    {
        generator: generatorTypes.initialFilterQ,
        fromGenerator: cb2db,
        toGenerator: db2cb,
        precision: 1,
        unit: "dB"
    },
    {
        generator: generatorTypes.delayVolEnv,
        highlight: true,
        unit: "tcent"
    },
    {
        generator: generatorTypes.attackVolEnv,
        highlight: true,
        unit: "tcent"
    },
    {
        generator: generatorTypes.holdVolEnv,
        highlight: true,
        unit: "tcent"
    },
    {
        generator: generatorTypes.decayVolEnv,
        highlight: true,
        unit: "tcent"
    },
    {
        generator: generatorTypes.sustainVolEnv,
        highlight: true,
        fromGenerator: cb2db,
        toGenerator: db2cb,
        precision: 1,
        unit: "dB"
    },
    {
        generator: generatorTypes.releaseVolEnv,
        highlight: true,
        unit: "tcent"
    },
    {
        generator: generatorTypes.keyNumToVolEnvHold,
        highlight: true,
        unit: "cent"
    },
    {
        generator: generatorTypes.keyNumToVolEnvDecay,
        highlight: true,
        unit: "cent"
    },
    {
        generator: generatorTypes.delayModEnv,
        unit: "tcent"
    },
    {
        generator: generatorTypes.attackModEnv,
        unit: "tcent"
    },
    {
        generator: generatorTypes.holdModEnv,
        unit: "tcent"
    },
    {
        generator: generatorTypes.decayModEnv,
        unit: "tcent"
    },
    {
        generator: generatorTypes.sustainModEnv,
        fromGenerator: (v) => v / 10,
        toGenerator: (v) => v * 10,
        precision: 1,
        unit: "dB"
    },
    {
        generator: generatorTypes.releaseModEnv,
        unit: "tcent"
    },
    {
        generator: generatorTypes.modEnvToFilterFc,
        unit: "cent"
    },
    {
        generator: generatorTypes.modEnvToPitch,
        unit: "cent"
    },
    {
        generator: generatorTypes.keyNumToModEnvHold,
        unit: "cent"
    },
    {
        generator: generatorTypes.keyNumToModEnvDecay,
        unit: "cent"
    },
    {
        generator: generatorTypes.delayModLFO,
        highlight: true,
        unit: "tcent"
    },
    {
        generator: generatorTypes.freqModLFO,
        highlight: true,
        unit: "acent"
    },
    {
        generator: generatorTypes.modLfoToPitch,
        highlight: true,
        unit: "cent"
    },
    {
        generator: generatorTypes.modLfoToFilterFc,
        highlight: true,
        unit: "cent"
    },
    {
        generator: generatorTypes.modLfoToVolume,
        highlight: true,
        fromGenerator: cb2db,
        toGenerator: db2cb,
        precision: 1,
        unit: "dB"
    },
    {
        generator: generatorTypes.delayVibLFO,
        unit: "tcent"
    },
    {
        generator: generatorTypes.freqVibLFO,
        unit: "acent"
    },
    {
        generator: generatorTypes.vibLfoToPitch,
        unit: "cent"
    },
    {
        generator: generatorTypes.chorusEffectsSend,
        highlight: true,
        fromGenerator: (v) => v / 10,
        toGenerator: (v) => v * 10,
        precision: 1,
        unit: "percent"
    },
    {
        generator: generatorTypes.reverbEffectsSend,
        highlight: true,
        fromGenerator: (v) => v / 10,
        toGenerator: (v) => v * 10,
        precision: 1,
        unit: "percent"
    }
];

export function PresetEditor({
    preset,
    engine,
    presets,
    setPresets,
    setView,
    manager
}: {
    preset: BasicPreset;
    engine: AudioEngine;
    presets: BasicPreset[];
    setPresets: (p: BasicPreset[]) => unknown;
    setView: SetViewType;
    manager: SoundBankManager;
}) {
    const zones = useMemo(
        () =>
            preset.presetZones.toSorted(
                (z1, z2) => z1.keyRange.min - z2.keyRange.min
            ),
        [preset.presetZones]
    );
    const global = preset.globalZone;
    const update = () => {
        setPresets([...presets]);
        engine.processor.clearCache();
    };
    useEffect(() => {
        engine.processor.midiAudioChannels[KEYBOARD_TARGET_CHANNEL].setPreset(
            preset
        );
        engine.processor.clearCache();
    }, [engine.processor, preset]);

    return (
        <div className={"preset_editor"}>
            <div className={"zone_table_wrapper"}>
                <GeneratorTable<BasicPresetZone>
                    name={preset.presetName}
                    zones={zones}
                    global={global}
                    callback={update}
                    rows={presetRows}
                    setView={setView}
                    manager={manager}
                />
            </div>
            <BottomPresetBar
                manager={manager}
                setPresets={setPresets}
                presets={presets}
                preset={preset}
                setView={setView}
            />
        </div>
    );
}
