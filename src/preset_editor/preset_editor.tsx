import {
    type BasicPreset,
    type BasicPresetZone,
    generatorTypes
} from "spessasynth_core";
import "./preset_editor.css";
import type { AudioEngine } from "../core_backend/audio_engine.ts";
import type { SetViewType } from "../bank_editor/bank_editor.tsx";
import { useEffect } from "react";
import { cb2db, db2cb } from "../utils/conversion_helpers.ts";
import { BottomPresetBar } from "./bottom_bar/bottom_bar.tsx";
import type SoundBankManager from "../core_backend/sound_bank_manager.ts";
import type { GeneratorRowType } from "../instrument_editor/instrument_editor.tsx";
import { GeneratorTable } from "../generator_table/generator_table.tsx";
import { KEYBOARD_TARGET_CHANNEL } from "../keyboard/target_channel.ts";
import { getZonesClickableKeys } from "../utils/get_instrument_clickable_keys.ts";
import type { ModulatorListGlobals } from "../modulator_editing/modulator_list/modulator_list.tsx";

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
    manager,
    setEnabledKeys,
    destinationOptions,
    ccOptions,
    clipboardManager
}: {
    preset: BasicPreset;
    engine: AudioEngine;
    presets: BasicPreset[];
    setPresets: (p: BasicPreset[]) => unknown;
    setView: SetViewType;
    manager: SoundBankManager;
    setEnabledKeys: (k: boolean[]) => unknown;
} & ModulatorListGlobals) {
    const update = () => {
        preset.presetZones = [...preset.presetZones];
        setPresets([...presets]);
        engine.processor.clearCache();
    };
    const zones = preset.presetZones;
    const global = preset.globalZone;

    useEffect(() => {
        engine.processor.midiAudioChannels[KEYBOARD_TARGET_CHANNEL].setPreset(
            preset
        );
        engine.processor.clearCache();
    }, [engine.processor, preset]);

    useEffect(() => {
        const clickableBool = Array(128).fill(false);
        zones.forEach(
            ({
                keyRange: { min, max },
                instrument: { instrumentZones, globalZone }
            }) => {
                if (min === -1) {
                    min = global.keyRange.min;
                    max = global.keyRange.max;
                }
                const clickableInst = getZonesClickableKeys(
                    instrumentZones,
                    globalZone.keyRange
                );
                for (let i = Math.max(min, 0); i <= max; i++) {
                    clickableBool[i] ||= clickableInst[i];
                }
            }
        );

        setEnabledKeys(clickableBool);
    }, [global.keyRange.max, global.keyRange.min, setEnabledKeys, zones]);

    return (
        <div className={"preset_editor"}>
            <GeneratorTable<BasicPresetZone, BasicPreset>
                name={preset.presetName}
                zones={zones}
                element={preset}
                global={global}
                callback={update}
                rows={presetRows}
                setView={setView}
                manager={manager}
                ccOptions={ccOptions}
                clipboardManager={clipboardManager}
                destinationOptions={destinationOptions}
            />
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
