import type { BasicSample } from "spessasynth_core";
import type { AudioEngine } from "../../core_backend/audio_engine.ts";
import "./sample_editor.css";

export function SampleEditor({
    engine,
    sample
}: {
    sample: BasicSample;
    engine: AudioEngine;
}) {
    const osc = engine.context.createBufferSource();
    console.log(osc);
    return <div>Test! Editing sample: {sample.sampleName}</div>;
}
