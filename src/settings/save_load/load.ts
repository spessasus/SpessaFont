import { type InterpolationType, InterpolationTypes } from "spessasynth_core";
import {
    BOOLEAN_SETTINGS,
    DEFAULT_SETTINGS,
    type SavedSettingsType,
    SETTING_LIMITS,
    SPESSAFONT_SETTINGS_KEY,
    UNSET_LANGUAGE
} from "./settings_typedef.ts";
import { LocaleList } from "../../locale/locale_list.ts";
import { logWarn } from "../../utils/core_utils.ts";
import { isTheme } from "../../themes/theme_list.ts";

const INTERPOLATIONS = new Set<unknown>(Object.values(InterpolationTypes));

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInRange(value: unknown, key: keyof typeof SETTING_LIMITS) {
    const { min, max } = SETTING_LIMITS[key];
    return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= min &&
        value <= max
    );
}

/**
 * Turns saved settings data into complete settings.
 * Unknown keys are dropped, and missing or invalid values fall back to the defaults,
 * so older saves and hand-edited data never break the app.
 */
export function parseSettings(data: unknown): SavedSettingsType {
    const settings = { ...DEFAULT_SETTINGS };
    if (!isRecord(data)) {
        return settings;
    }

    const { lang, theme, interpolation } = data;
    if (
        typeof lang === "string" &&
        (lang === UNSET_LANGUAGE || Object.hasOwn(LocaleList, lang))
    ) {
        settings.lang = lang;
    }
    if (isTheme(theme)) {
        settings.theme = theme;
    }
    if (INTERPOLATIONS.has(interpolation)) {
        settings.interpolation = interpolation as InterpolationType;
    }
    for (const key of BOOLEAN_SETTINGS) {
        const value = data[key];
        if (typeof value === "boolean") {
            settings[key] = value;
        }
    }
    for (const key of Object.keys(
        SETTING_LIMITS
    ) as (keyof typeof SETTING_LIMITS)[]) {
        const value = data[key];
        if (isInRange(value, key)) {
            settings[key] = value as number;
        }
    }
    return settings;
}

export function loadSettings(): SavedSettingsType {
    const data = localStorage.getItem(SPESSAFONT_SETTINGS_KEY);
    if (data === null) {
        return { ...DEFAULT_SETTINGS };
    }
    try {
        return parseSettings(JSON.parse(data));
    } catch (error) {
        logWarn("Saved settings are corrupt, using the defaults.", error);
        return { ...DEFAULT_SETTINGS };
    }
}
