import { useSettings } from "../settings/settings_context.ts";
import type { GeneratorGroup, PhoneGridMode } from "./generator_groups.ts";

/**
 * The phone grid's view settings: the mode, Values only and the collapsed groups.
 */
export function usePhoneGridSettings() {
    const { settings, updateSettings } = useSettings();
    const groups = settings.phoneCollapsedGroups;
    const collapsed: ReadonlySet<GeneratorGroup> = new Set(groups);
    return {
        mode: settings.phoneGridMode,
        isValuesOnly: settings.phoneValuesOnly,
        collapsed,
        setMode: (mode: PhoneGridMode) => {
            updateSettings({ phoneGridMode: mode });
        },
        setValuesOnly: (isValuesOnly: boolean) => {
            updateSettings({ phoneValuesOnly: isValuesOnly });
        },
        toggleGroup: (group: GeneratorGroup) => {
            updateSettings({
                phoneCollapsedGroups: groups.includes(group)
                    ? groups.filter((g) => g !== group)
                    : [...groups, group]
            });
        },
        setCollapsed: (next: readonly GeneratorGroup[]) => {
            updateSettings({ phoneCollapsedGroups: [...next] });
        }
    };
}
