import { useTranslation } from "react-i18next";
import { type InterpolationType, InterpolationTypes } from "spessasynth_core";
import { WaitingInput } from "../../fancy_inputs/waiting_input/waiting_input.tsx";
import {
    clampSetting,
    type SavedSettingsType,
    SETTING_LIMITS
} from "../save_load/settings_typedef.ts";
import { Setting } from "../setting.tsx";

export interface GroupSettingsProps {
    settings: SavedSettingsType;
    onChange: (changes: Partial<SavedSettingsType>) => void;
}

type LimitedSetting = keyof typeof SETTING_LIMITS;

interface NumberSettingProps extends GroupSettingsProps {
    label: string;
    name: LimitedSetting;
    /**
     * Shows the gain times 100, with a % suffix.
     */
    isPercent?: boolean;
    suffix?: string;
    maxLength?: number;
    /**
     * Applied to the typed value before it is clamped.
     */
    normalize?: (value: number) => number;
    /**
     * A value outside the range is taken as a typo and keeps the old value, instead of being
     * clamped. For settings where the limit is as bad as a wrong value.
     */
    isRangeStrict?: boolean;
}

function NumberSetting({
    label,
    name,
    settings,
    onChange,
    isPercent = false,
    suffix,
    maxLength = 5,
    normalize,
    isRangeStrict = false
}: NumberSettingProps) {
    const scale = isPercent ? 100 : 1;
    return (
        <Setting label={label}>
            <WaitingInput
                onCommit={(typed) => {
                    const current = settings[name] * scale;
                    if (!Number.isFinite(typed)) {
                        return current;
                    }
                    const scaled = typed / scale;
                    const normalized = normalize ? normalize(scaled) : scaled;
                    const { min, max } = SETTING_LIMITS[name];
                    if (
                        isRangeStrict &&
                        (normalized < min || normalized > max)
                    ) {
                        return current;
                    }
                    const value = clampSetting(name, normalized);
                    onChange({ [name]: value });
                    return value * scale;
                }}
                type={"text"}
                maxLength={maxLength}
                className={"pretty_input monospaced"}
                suffix={isPercent ? "%" : suffix}
                value={
                    isPercent
                        ? // Rounded, as 0.29 * 100 is 28.999...
                          Math.round(settings[name] * scale)
                        : settings[name]
                }
            />
        </Setting>
    );
}

export function AudioEngineSettings({
    onChange,
    settings
}: GroupSettingsProps) {
    const { t } = useTranslation();
    const shared = { settings, onChange };
    return (
        <div className={"settings_group hover_brightness"}>
            <h2>{t("settingsLocale.audioEngine.title")}</h2>
            <NumberSetting
                {...shared}
                label={t("settingsLocale.audioEngine.sampleRate")}
                name={"sampleRate"}
                suffix={"Hz"}
                maxLength={8}
                normalize={Math.round}
                isRangeStrict={true}
            />
            <NumberSetting
                {...shared}
                label={t("settingsLocale.audioEngine.volume")}
                name={"volume"}
                isPercent={true}
            />

            <Setting
                label={t("settingsLocale.audioEngine.interpolation.title")}
            >
                <select
                    onChange={(e) =>
                        onChange({
                            interpolation: Number.parseInt(
                                e.target.value
                            ) as InterpolationType
                        })
                    }
                    className={"pretty_input monospaced"}
                    value={settings.interpolation}
                >
                    <option value={InterpolationTypes.nearestNeighbor}>
                        {t(
                            "settingsLocale.audioEngine.interpolation.nearestNeighbor"
                        )}
                    </option>
                    <option value={InterpolationTypes.linear}>
                        {t("settingsLocale.audioEngine.interpolation.linear")}
                    </option>
                    <option value={InterpolationTypes.hermite}>
                        {t("settingsLocale.audioEngine.interpolation.cubic")}
                    </option>
                    <option value={InterpolationTypes.sinc32}>
                        {t("settingsLocale.audioEngine.interpolation.sinc32")}
                    </option>
                    <option value={InterpolationTypes.sinc128}>
                        {t("settingsLocale.audioEngine.interpolation.sinc128")}
                    </option>
                </select>
            </Setting>

            <NumberSetting
                {...shared}
                label={t("settingsLocale.audioEngine.voiceCap")}
                name={"voiceCap"}
                normalize={(value) => Math.round(Math.abs(value))}
            />
            <NumberSetting
                {...shared}
                label={t("settingsLocale.audioEngine.velocitySenseDepth")}
                name={"velocitySenseDepth"}
            />
            <NumberSetting
                {...shared}
                label={t("settingsLocale.audioEngine.velocitySenseOffset")}
                name={"velocitySenseOffset"}
            />
            <NumberSetting
                {...shared}
                label={t("settingsLocale.audioEngine.reverbLevel")}
                name={"reverbLevel"}
                isPercent={true}
            />
            <NumberSetting
                {...shared}
                label={t("settingsLocale.audioEngine.chorusLevel")}
                name={"chorusLevel"}
                isPercent={true}
            />
            <NumberSetting
                {...shared}
                label={t("settingsLocale.audioEngine.delayLevel")}
                name={"delayLevel"}
                isPercent={true}
            />
        </div>
    );
}
