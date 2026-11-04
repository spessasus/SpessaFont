import { type InterpolationType, InterpolationTypes } from "spessasynth_core";
import {
    readSampleRateParam,
    SAMPLE_RATE_LIMITS
} from "../../utils/sample_rate_param.ts";
import type { ThemeType } from "../../themes/theme_list.ts";

export interface SavedSettingsType {
    lang: string;
    volume: number;
    theme: ThemeType;
    interpolation: InterpolationType;

    velocitySenseDepth: number;
    velocitySenseOffset: number;

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
    interpolation: InterpolationTypes.hermite,

    velocitySenseDepth: 64,
    velocitySenseOffset: 64,

    reverbLevel: 1,
    chorusLevel: 1,
    delayLevel: 1,

    voiceCap: 350,
    sampleRate: readSampleRateParam()
};

type NumericSettingKey = {
    [K in keyof SavedSettingsType]: SavedSettingsType[K] extends number
        ? K
        : never;
}[keyof SavedSettingsType];

/**
 * The accepted range of every numeric setting, shared by the settings UI and the parser.
 * The sample rate range is the one `AudioContext` accepts.
 */
export const SETTING_LIMITS: Record<
    Exclude<NumericSettingKey, "interpolation">,
    { min: number; max: number }
> = {
    volume: { min: 0, max: 10 },
    velocitySenseDepth: { min: 0, max: 127 },
    velocitySenseOffset: { min: 0, max: 127 },
    reverbLevel: { min: 0, max: 10 },
    chorusLevel: { min: 0, max: 10 },
    delayLevel: { min: 0, max: 10 },
    voiceCap: { min: 0, max: 2048 },
    sampleRate: SAMPLE_RATE_LIMITS
};

/**
 * Clamps a value to the accepted range of a numeric setting.
 */
export function clampSetting(key: keyof typeof SETTING_LIMITS, value: number) {
    const { min, max } = SETTING_LIMITS[key];
    return Math.max(min, Math.min(max, value));
}
