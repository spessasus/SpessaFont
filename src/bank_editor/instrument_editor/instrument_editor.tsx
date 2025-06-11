import type { AudioEngine } from "../../core_backend/audio_engine.ts";
import type { BasicInstrument } from "spessasynth_core";
import "./instrument_editor.css";

export function InstrumentEditor({
    engine,
    instrument
}: {
    engine: AudioEngine;
    instrument: BasicInstrument;
}) {
    // do some hacky stuff to get the instrument to play
    engine.processor.resetAllControllers();
    return <div>Test! Editing instrument: {instrument.instrumentName}</div>;
}
