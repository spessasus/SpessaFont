import { useEffect, useEffectEvent } from "react";
import type { ForwardedSynthEvent } from "../synth_host/protocol.ts";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";

/**
 * Calls the handler for every synthesizer event while the component is mounted.
 * The handler always sees the latest props and state, so it does not need to be memoized.
 */
export function useSynthEvent(handler: (event: ForwardedSynthEvent) => void) {
    const { audioEngine } = useAudioEngine();
    const onEvent = useEffectEvent(handler);
    useEffect(
        () => audioEngine.synthEvents.subscribe((event) => onEvent(event)),
        [audioEngine]
    );
}
