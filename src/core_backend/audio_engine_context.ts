import type { AudioEngine } from "./audio_engine.ts";
import { createContext, useContext } from "react";

interface AudioEngineContextType {
    audioEngine: AudioEngine;
}

export const AudioEngineContext = createContext<AudioEngineContextType | null>(
    null
);

export function useAudioEngine() {
    const ctx = useContext(AudioEngineContext);
    if (!ctx) throw new Error("Used without AudioEngineProvider context!");
    return ctx;
}
