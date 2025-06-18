import type { AudioEngine } from "../../core_backend/audio_engine.ts";
import { type BasicInstrument, BasicPreset } from "spessasynth_core";
import "./instrument_editor.css";
import { useEffect } from "react";
import { KEYBOARD_TARGET_CHANNEL } from "../../keyboard/target_channel.ts";
import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";

export function InstrumentEditor({
    engine,
    instrument,
    manager
}: {
    engine: AudioEngine;
    instrument: BasicInstrument;
    manager: SoundBankManager;
}) {
    // do some hacky stuff to get the instrument to play
    useEffect(() => {
        engine.processor.clearCache();
        const preset = new BasicPreset(manager.bank);
        preset.presetName = "Dummy Preset";
        preset.createZone().setInstrument(instrument);
        engine.processor.midiAudioChannels[KEYBOARD_TARGET_CHANNEL].setPreset(
            preset
        );
        return () => {
            engine.processor.clearCache();
            engine.processor.programChange(KEYBOARD_TARGET_CHANNEL, 0);
        };
    }, [engine.processor, instrument, manager.bank]);
    return <div>Test! Editing instrument: {instrument.instrumentName}</div>;
}
