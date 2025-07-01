import { interpolationTypes, masterParameterType } from "spessasynth_core";
import type { AudioEngine } from "../../core_backend/audio_engine.ts";

export type ThemeType = "dark" | "light";

export type SavedSettingsType = {
    lang: string;
    volume: number;
    theme: ThemeType;
    interpolation: interpolationTypes;
    reverbLevel: number;
    chorusLevel: number;
};
export const UNSET_LANGUAGE = "UNSET";
export const SPESSAFONT_SETTINGS_KEY = "SPESSAFONT-USER-SETTINGS";

export const DEFAULT_SETTINGS: SavedSettingsType = {
    lang: UNSET_LANGUAGE,
    volume: 2,
    theme: "dark",
    interpolation: interpolationTypes.fourthOrder,
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
        masterParameterType.interpolationType,
        getSetting("interpolation", settings)
    );
    processor.reverbGain = getSetting("reverbLevel", settings);
    processor.chorusGain = getSetting("chorusLevel", settings);
}
