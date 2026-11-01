import {
    type BasicInstrument,
    type BasicInstrumentZone,
    BasicPreset,
    type GeneratorType,
    GeneratorTypes,
    type GenericRange
} from "spessasynth_core";
import "./instrument_editor.css";
import { useEffect } from "react";
import { KEYBOARD_TARGET_CHANNEL } from "../keyboard/target_channel.ts";
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
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useEntityRevision } from "../hooks/use_entity_revision.ts";
import { getObjectId } from "../utils/object_id.ts";

interface InstrumentEditorProps {
    instrument: BasicInstrument;
    setSplits: (s: GenericRange[]) => unknown;
}
export interface GeneratorRowType {
    generator: GeneratorType;
    fromGenerator?: (v: number) => number;
    toGenerator?: (v: number) => number;
    highlight?: boolean;
    unit?: string;
    precision?: number;
}
const instrumentRows: GeneratorRowType[] = [
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
        generator: GeneratorTypes.sampleModes
    },
    {
        generator: GeneratorTypes.overridingRootKey
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
        fromGenerator: ac2hz,
        toGenerator: hz2ac,
        unit: "Hz"
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
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: GeneratorTypes.attackVolEnv,
        highlight: true,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: GeneratorTypes.holdVolEnv,
        highlight: true,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: GeneratorTypes.decayVolEnv,
        highlight: true,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
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
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
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
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: GeneratorTypes.attackModEnv,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: GeneratorTypes.holdModEnv,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: GeneratorTypes.decayModEnv,
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
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
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
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
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: GeneratorTypes.freqModLFO,
        highlight: true,
        fromGenerator: ac2hz,
        toGenerator: hz2ac,
        precision: 3,
        unit: "Hz"
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
        fromGenerator: tc2s,
        toGenerator: s2tc,
        precision: 3,
        unit: "sec"
    },
    {
        generator: GeneratorTypes.freqVibLFO,
        fromGenerator: ac2hz,
        toGenerator: hz2ac,
        precision: 3,
        unit: "Hz"
    },
    {
        generator: GeneratorTypes.vibLfoToPitch,
        unit: "cent"
    },
    {
        generator: GeneratorTypes.exclusiveClass,
        highlight: true
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
    },
    {
        generator: GeneratorTypes.keyNum
    },
    {
        generator: GeneratorTypes.velocity
    },
    {
        generator: GeneratorTypes.startAddrsOffset
    },
    {
        generator: GeneratorTypes.endAddrOffset
    },
    {
        generator: GeneratorTypes.startloopAddrsOffset
    },
    {
        generator: GeneratorTypes.endloopAddrsOffset
    }
];

export function InstrumentEditor({
    instrument,
    setSplits,
    clipboardManager,
    ccOptions,
    destinationOptions
}: InstrumentEditorProps & ModulatorListGlobals) {
    const {
        audioEngine: { processor }
    } = useAudioEngine();

    const { session } = useBankEditor();
    const revision = useEntityRevision(session.store, instrument);
    const bank = session.document.bank;

    const zones = instrument.zones;

    const global = instrument.globalZone;
    useEffect(() => {
        // do some hacky stuff to get the zones to play
        const preset = new BasicPreset(bank);
        // screaming name so it's easier to spot errors
        preset.name = "INSTRUMENT PLAYBACK PRESET";

        preset.createZone(instrument);
        // note: unlink it we don't want the instrument to be aware of the preset
        // (it won't allow us to delete it)
        instrument.unlinkFrom(preset);
        processor.midiChannels[KEYBOARD_TARGET_CHANNEL].preset = preset;
        processor.clearCache();
        return () => {
            // manually clear the preset to not trigger any warnings
            // (the instrument is not linked to the preset in this hack)
            processor.clearCache();
            processor.programChange(KEYBOARD_TARGET_CHANNEL, 0);
        };
    }, [processor, instrument, bank]);

    // set up splits
    useEffect(() => {
        setSplits(getZoneSplits(zones, global.keyRange));
        // The zones are mutable, so the revision tells when they changed
    }, [zones, setSplits, global, revision]);

    // cleanup, set no splits
    useEffect(() => {
        return () => {
            setSplits([]);
        };
    }, [setSplits]);

    return (
        <div className={"instrument_editor"}>
            <GeneratorTable<BasicInstrumentZone, BasicInstrument>
                key={getObjectId(instrument)}
                rows={instrumentRows}
                element={instrument}
                zones={zones}
                global={global}
                name={instrument.name}
                clipboardManager={clipboardManager}
                ccOptions={ccOptions}
                destinationOptions={destinationOptions}
            />
            <LinkedPresets instrument={instrument} />
        </div>
    );
}
