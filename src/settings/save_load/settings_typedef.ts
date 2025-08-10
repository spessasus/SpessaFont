import { type InterpolationType, interpolationTypes } from "spessasynth_core";
import type { AudioEngine } from "../../core_backend/audio_engine.ts";

export type ThemeType = "dark" | "light";

export interface SavedSettingsType {
    lang: string;
    volume: number;
    theme: ThemeType;
    interpolation: InterpolationType;
    reverbLevel: number;
    chorusLevel: number;
}

export const UNSET_LANGUAGE = "UNSET";
export const SPESSAFONT_SETTINGS_KEY = "SPESSAFONT-USER-SETTINGS";

export const DEFAULT_SETTINGS: SavedSettingsType = {
    lang: UNSET_LANGUAGE,
    volume: 2,
    theme: "dark",
    interpolation: interpolationTypes.hermite,
    reverbLevel: 1,
    chorusLevel: 1
};

export function getSetting<K extends keyof SavedSettingsType>(
    key: K,
    settings: SavedSettingsType
): SavedSettingsType[K] {
    return settings[key] ?? DEFAULT_SETTINGS[key];
}

export function applyAudioSettings(
    settings: SavedSettingsType,
    engine: AudioEngine
) {
    const processor = engine.processor;
    engine.setVolume(getSetting("volume", settings));
    processor.setMasterParameter(
        "interpolationType",
        getSetting("interpolation", settings)
    );
    processor.setMasterParameter(
        "reverbGain",
        getSetting("reverbLevel", settings)
    );
    processor.setMasterParameter(
        "chorusGain",
        getSetting("chorusLevel", settings)
    );
}
