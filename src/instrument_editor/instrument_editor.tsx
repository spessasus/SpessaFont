import type { AudioEngine } from "../core_backend/audio_engine.ts";
import {
    type BasicInstrument,
    type BasicInstrumentZone,
    BasicPreset,
    generatorTypes,
    type SoundFontRange
} from "spessasynth_core";
import "./instrument_editor.css";
import { useEffect } from "react";
import { KEYBOARD_TARGET_CHANNEL } from "../keyboard/target_channel.ts";
import type SoundBankManager from "../core_backend/sound_bank_manager.ts";
import type { SetViewType } from "../bank_editor/bank_editor.tsx";
import {
    ac2hz,
    cb2db,
    db2cb,
    hz2ac,
    s2tc,
    tc2s
} from "../utils/conversion_helpers.ts";
import { LinkedPresets } from "./linked_presets/linked_presets.tsx";
import { GeneratorTable } from "../generator_table/generator_table.tsx";
import { getZoneSplits } from "../utils/get_instrument_clickable_keys.ts";
import type { ModulatorListGlobals } from "../modulator_editing/modulator_list/modulator_list.tsx";

type InstrumentEditorProps = {
    manager: SoundBankManager;
    instrument: BasicInstrument;
    engine: AudioEngine;
    setView: SetViewType;
    setInstruments: (s: BasicInstrument[]) => void;
    instruments: BasicInstrument[];
    setSplits: (s: SoundFontRange[]) => unknown;
};
export type GeneratorRowType = {
    generator: generatorTypes;
    fromGenerator?: (v: number) => number;
    toGenerator?: (v: number) => number;
    highlight?: boolean;
    unit?: string;
    precision?: number;
};
const instrumentRows: GeneratorRowType[] = [
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
        generator: generatorTypes.sampleModes
    },
    {
        generator: generatorTypes.overridingRootKey
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
        fromGenerator: ac2hz,
        toGenerator: hz2ac,
        unit: "Hz"
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
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: generatorTypes.attackVolEnv,
        highlight: true,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: generatorTypes.holdVolEnv,
        highlight: true,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: generatorTypes.decayVolEnv,
        highlight: true,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
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
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
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
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: generatorTypes.attackModEnv,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: generatorTypes.holdModEnv,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: generatorTypes.decayModEnv,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
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
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
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
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: generatorTypes.freqModLFO,
        highlight: true,
        fromGenerator: ac2hz,
        toGenerator: hz2ac,
        precision: 3,
        unit: "Hz"
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
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: generatorTypes.freqVibLFO,
        fromGenerator: ac2hz,
        toGenerator: hz2ac,
        precision: 3,
        unit: "Hz"
    },
    {
        generator: generatorTypes.vibLfoToPitch,
        unit: "cent"
    },
    {
        generator: generatorTypes.exclusiveClass,
        highlight: true
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
    },
    {
        generator: generatorTypes.keyNum
    },
    {
        generator: generatorTypes.velocity
    },
    {
        generator: generatorTypes.startAddrsOffset
    },
    {
        generator: generatorTypes.endAddrOffset
    },
    {
        generator: generatorTypes.startloopAddrsOffset
    },
    {
        generator: generatorTypes.endloopAddrsOffset
    }
];

export function InstrumentEditor({
    engine,
    instrument,
    manager,
    setInstruments,
    instruments,
    setView,
    setSplits,
    clipboardManager,
    ccOptions,
    destinationOptions
}: InstrumentEditorProps & ModulatorListGlobals) {
    const update = () => {
        instrument.instrumentZones = [...instrument.instrumentZones];
        setInstruments([...instruments]);
        engine.processor.clearCache();
    };

    const zones = instrument.instrumentZones;

    const global = instrument.globalZone;
    useEffect(() => {
        // do some hacky stuff to get the zones to play
        const preset = new BasicPreset(manager);
        // screaming name so it's easier to spot errors
        preset.presetName = "INSTRUMENT PLAYBACK PRESET";
        // note: do not use setInstrument as we don't want the instrument to be aware of the preset
        // (it won't allow us to delete it)
        preset.createZone().instrument = instrument;
        engine.processor.midiAudioChannels[KEYBOARD_TARGET_CHANNEL].setPreset(
            preset
        );
        engine.processor.clearCache();
        return () => {
            // manually clear the preset to not trigger any warnings
            // (the instrument is not linked to the preset in this hack)
            engine.processor.clearCache();
            engine.processor.programChange(KEYBOARD_TARGET_CHANNEL, 0);
        };
    }, [engine.processor, instrument, manager]);

    // set up splits
    useEffect(() => {
        setSplits(getZoneSplits(zones, global.keyRange));
    }, [zones, setSplits, global.keyRange]);

    // cleanup, set no splits
    useEffect(() => {
        return () => {
            setSplits([]);
        };
    }, [setSplits]);

    return (
        <div className={"instrument_editor"}>
            <GeneratorTable<BasicInstrumentZone, BasicInstrument>
                manager={manager}
                callback={update}
                rows={instrumentRows}
                element={instrument}
                zones={zones}
                global={global}
                name={instrument.instrumentName}
                setView={setView}
                clipboardManager={clipboardManager}
                ccOptions={ccOptions}
                destinationOptions={destinationOptions}
            />
            <LinkedPresets
                instrument={instrument}
                manager={manager}
                setInstruments={setInstruments}
                instruments={instruments}
                setView={setView}
            />
        </div>
    );
}
