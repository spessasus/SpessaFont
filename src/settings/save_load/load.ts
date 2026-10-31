import {
    DEFAULT_SETTINGS,
    type SavedSettingsType,
    SPESSAFONT_SETTINGS_KEY
} from "./settings_typedef.ts";

export function loadSettings(): SavedSettingsType {
    const data: string | null = localStorage.getItem(SPESSAFONT_SETTINGS_KEY);
    return data ? (JSON.parse(data) as SavedSettingsType) : DEFAULT_SETTINGS;
}
