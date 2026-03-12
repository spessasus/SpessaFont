import { type InterpolationType, interpolationTypes } from "spessasynth_core";
import type { AudioEngine } from "../../core_backend/audio_engine.ts";
import { readSampleRateParam } from "../../utils/sample_rate_param.ts";

export type ThemeType = "dark" | "light";

export interface SavedSettingsType {
    lang: string;
    volume: number;
    theme: ThemeType;
    interpolation: InterpolationType;
    reverbLevel: number;
    chorusLevel: number;
    delayLevel: number;
    voiceCap: number;
    sampleRate: number;
}

export const UNSET_LANGUAGE = "UNSET";
export const SPESSAFONT_SETTINGS_KEY = "SPESSAFONT-USER-SETTINGS";

let CURRENT_SAMPLE_RATE = readSampleRateParam();
export const DEFAULT_SETTINGS: SavedSettingsType = {
    lang: UNSET_LANGUAGE,
    volume: 2,
    theme: "dark",
    interpolation: interpolationTypes.hermite,
    reverbLevel: 1,
    chorusLevel: 1,
    delayLevel: 1,
    voiceCap: 350,
    sampleRate: CURRENT_SAMPLE_RATE
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
    processor.setMasterParameter(
        "delayGain",
        getSetting("delayLevel", settings)
    );
    processor.setMasterParameter("voiceCap", getSetting("voiceCap", settings));
    const rate = getSetting("sampleRate", settings);
    if (CURRENT_SAMPLE_RATE !== rate) {
        CURRENT_SAMPLE_RATE = rate;
        const url = new URL(globalThis.location.href);
        url.searchParams.set("samplerate", rate.toString());
        globalThis.location.replace(url);
    }
}
