import { useSyncExternalStore } from "react";
import type { SpessaSynthProcessor } from "spessasynth_core";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";

/**
 * Reads a value from the synthesizer and re-renders when it changes.
 * Any synth event re-reads it, and React skips the render when the value is the same, so `read`
 * must return a primitive.
 */
export function useSynthValue<T extends number | boolean | string>(
    read: (processor: SpessaSynthProcessor) => T
) {
    const { audioEngine } = useAudioEngine();
    return useSyncExternalStore(audioEngine.synthEvents.subscribe, () =>
        read(audioEngine.processor)
    );
}
