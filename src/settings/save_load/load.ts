import {
    DEFAULT_SETTINGS,
    type SavedSettingsType,
    SPESSAFONT_SETTINGS_KEY
} from "./settings_typedef.ts";

export function loadSettings(): SavedSettingsType {
    const data: string | null = window.localStorage.getItem(
        SPESSAFONT_SETTINGS_KEY
    );
    let settings: SavedSettingsType;
    if (data) {
        settings = JSON.parse(data) as SavedSettingsType;
    } else {
        settings = DEFAULT_SETTINGS;
    }
    return settings;
}
