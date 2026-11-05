import { useSyncExternalStore } from "react";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import type { EngineStatus } from "../core_backend/engine_status.ts";

/**
 * Reads one value of the engine status. Select a field, so the component re-renders only when it
 * changes.
 */
export function useEngineStatus<T>(select: (status: EngineStatus) => T) {
    const { audioEngine } = useAudioEngine();
    const { status } = audioEngine;
    return useSyncExternalStore(status.subscribe, () =>
        select(status.getSnapshot())
    );
}
