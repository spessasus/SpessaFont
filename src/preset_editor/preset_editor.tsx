import {
    type BasicPreset,
    type BasicPresetZone,
    GeneratorTypes,
    type GenericRange
} from "spessasynth_core";
import "./preset_editor.css";
import type { SetViewType } from "../bank_editor/bank_editor.tsx";
import { useEffect } from "react";
import { cb2db, db2cb } from "../utils/conversion_helpers.ts";
import { BottomPresetBar } from "./bottom_bar/bottom_bar.tsx";
import type SoundBankManager from "../core_backend/sound_bank_manager.ts";
import type { GeneratorRowType } from "../instrument_editor/instrument_editor.tsx";
import { GeneratorTable } from "../generator_table/generator_table.tsx";
import { KEYBOARD_TARGET_CHANNEL } from "../keyboard/target_channel.ts";
import { getZoneSplits } from "../utils/get_instrument_clickable_keys.ts";
import type { ModulatorListGlobals } from "../modulator_editing/modulator_list/modulator_list.tsx";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";

const presetRows: GeneratorRowType[] = [
    {
        generator: GeneratorTypes.keyRange
    },
    {
        generator: GeneratorTypes.velRange
    },
    {
        generator: GeneratorTypes.initialAttenuation,
        fromGenerator: (v) => v * 0.04,
        toGenerator: (v) => v / 0.04,
        unit: "dB",
        precision: 2
    },
    {
        generator: GeneratorTypes.pan,
        unit: "pan"
    },
    {
        generator: GeneratorTypes.coarseTune,
        highlight: true
    },
    {
        generator: GeneratorTypes.fineTune,
        highlight: true
    },
    {
        generator: GeneratorTypes.scaleTuning,
        highlight: true,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.initialFilterFc,
        unit: "acent"
    },
    {
        generator: GeneratorTypes.initialFilterQ,
        fromGenerator: cb2db,
        toGenerator: db2cb,
        precision: 1,
        unit: "dB"
    },
    {
        generator: GeneratorTypes.delayVolEnv,
        highlight: true,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.attackVolEnv,
        highlight: true,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.holdVolEnv,
        highlight: true,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.decayVolEnv,
        highlight: true,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.sustainVolEnv,
        highlight: true,
        fromGenerator: cb2db,
        toGenerator: db2cb,
        precision: 1,
        unit: "dB"
    },
    {
        generator: GeneratorTypes.releaseVolEnv,
        highlight: true,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.keyNumToVolEnvHold,
        highlight: true,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.keyNumToVolEnvDecay,
        highlight: true,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.delayModEnv,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.attackModEnv,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.holdModEnv,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.decayModEnv,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.sustainModEnv,
        fromGenerator: (v) => v / 10,
        toGenerator: (v) => v * 10,
        precision: 1,
        unit: "percent"
    },
    {
        generator: GeneratorTypes.releaseModEnv,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.modEnvToFilterFc,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.modEnvToPitch,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.keyNumToModEnvHold,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.keyNumToModEnvDecay,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.delayModLFO,
        highlight: true,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.freqModLFO,
        highlight: true,
        unit: "acent"
    },
    {
        generator: GeneratorTypes.modLfoToPitch,
        highlight: true,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.modLfoToFilterFc,
        highlight: true,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.modLfoToVolume,
        highlight: true,
        fromGenerator: cb2db,
        toGenerator: db2cb,
        precision: 1,
        unit: "dB"
    },
    {
        generator: GeneratorTypes.delayVibLFO,
        unit: "tcent"
    },
    {
        generator: GeneratorTypes.freqVibLFO,
        unit: "acent"
    },
    {
        generator: GeneratorTypes.vibLfoToPitch,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.chorusEffectsSend,
        highlight: true,
        fromGenerator: (v) => v / 10,
        toGenerator: (v) => v * 10,
        precision: 1,
        unit: "percent"
    },
    {
        generator: GeneratorTypes.reverbEffectsSend,
        highlight: true,
        fromGenerator: (v) => v / 10,
        toGenerator: (v) => v * 10,
        precision: 1,
        unit: "percent"
    }
];

export function PresetEditor({
    preset,
    presets,
    setPresets,
    setView,
    manager,
    setSplits,
    destinationOptions,
    ccOptions,
    clipboardManager
}: {
    preset: BasicPreset;
    presets: BasicPreset[];
    setPresets: (p: BasicPreset[]) => unknown;
    setView: SetViewType;
    manager: SoundBankManager;
    setSplits: (s: GenericRange[]) => unknown;
} & ModulatorListGlobals) {
    const {
        audioEngine: { processor }
    } = useAudioEngine();
    const update = () => {
        preset.zones = [...preset.zones];
        setPresets([...presets]);
        processor.clearCache();
    };
    const presetZones = preset.zones;
    const global = preset.globalZone;

    useEffect(() => {
        processor.midiChannels[KEYBOARD_TARGET_CHANNEL].preset = preset;
        processor.clearCache();
    }, [processor, preset]);

    useEffect(() => {
        const splits: GenericRange[] = [];
        const glob = global.keyRange;
        for (const {
            keyRange: { min, max },
            instrument: { zones, globalZone }
        } of presetZones) {
            const range = { ...globalZone.keyRange };
            range.min = Math.max(range.min, min);
            range.max = Math.min(range.max, max);
            for (let { min, max } of getZoneSplits(zones, range)) {
                // don't add out of range
                if (max < glob.min || min > glob.max) {
                    continue;
                }
                // clamp in range
                max = Math.min(glob.max, max);
                min = Math.max(glob.min, min);
                splits.push({ min, max });
            }
        }

        setSplits(splits);
    }, [
        global.keyRange,
        global.keyRange.max,
        global.keyRange.min,
        setSplits,
        presetZones
    ]);

    return (
        <div className={"preset_editor"}>
            <GeneratorTable<BasicPresetZone, BasicPreset>
                name={preset.name}
                zones={presetZones}
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
