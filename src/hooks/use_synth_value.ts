import { useSyncExternalStore } from "react";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import type { KeyboardChannelValues } from "../core_backend/keyboard_channel_store.ts";

/**
 * Reads a value of the keyboard's channel and re-renders when it changes.
 * React skips the render when the value is the same, so `read` must return a primitive.
 */
export function useSynthValue<T extends number | boolean | string>(
    read: (channel: KeyboardChannelValues) => T
) {
    const { audioEngine } = useAudioEngine();
    const { keyboardChannel } = audioEngine;
    return useSyncExternalStore(keyboardChannel.subscribe, () =>
        read(keyboardChannel.getSnapshot())
    );
}
