import { type InterpolationType, interpolationTypes } from "spessasynth_core";
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

export const DEFAULT_SETTINGS: SavedSettingsType = {
    lang: UNSET_LANGUAGE,
    volume: 1,
    theme: "dark",
    interpolation: interpolationTypes.hermite,
    reverbLevel: 1,
    chorusLevel: 1,
    delayLevel: 1,
    voiceCap: 350,
    sampleRate: readSampleRateParam()
};

export function getSetting<K extends keyof SavedSettingsType>(
    key: K,
    settings: SavedSettingsType
): SavedSettingsType[K] {
    return settings[key] ?? DEFAULT_SETTINGS[key];
}
