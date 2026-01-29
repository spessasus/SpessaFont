import {
    type SavedSettingsType,
    SPESSAFONT_SETTINGS_KEY
} from "./settings_typedef.ts";
import { logInfo } from "../../utils/core_utils.ts";

export function saveSettings(data: SavedSettingsType) {
    const serialized = JSON.stringify(data);
    globalThis.localStorage.setItem(SPESSAFONT_SETTINGS_KEY, serialized);
    logInfo("Settings saved in the browser!");
}
