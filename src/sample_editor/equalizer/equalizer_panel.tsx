import "./equalizer_panel.css";
import { useTranslation } from "react-i18next";
import { EqualizerCurve } from "./equalizer_curve.tsx";
import {
    EQ_FREQUENCIES,
    EQ_MAX_BAND_GAIN,
    EQ_MAX_GAIN,
    type EqualizerState,
    FLAT_EQUALIZER,
    getBandGains,
    isFlat
} from "./equalizer.ts";

const STEP = 0.5;

function formatGain(gain: number) {
    return gain > 0 ? `+${gain}` : String(gain);
}

function formatFrequency(frequency: number) {
    return frequency >= 1000 ? `${frequency / 1000}k` : String(frequency);
}

interface EqualizerSliderProps {
    value: number;
    max: number;
    label: string;
    ariaLabel: string;
    isDisabled: boolean;
    onChange: (value: number) => void;
}

function EqualizerSlider({
    value,
    max,
    label,
    ariaLabel,
    isDisabled,
    onChange
}: EqualizerSliderProps) {
    return (
        <div className={"equalizer_slider"}>
            <span
                className={`monospaced equalizer_value ${value === 0 ? "" : "changed"}`}
            >
                {formatGain(value)}
            </span>
            <input
                type={"range"}
                min={-max}
                max={max}
                step={STEP}
                value={value}
                disabled={isDisabled}
                aria-label={ariaLabel}
                onChange={(e) => onChange(Number(e.target.value))}
                // A quick way back to flat, the reset button clears every band
                onDoubleClick={() => onChange(0)}
            />
            <span className={"equalizer_label"}>{label}</span>
        </div>
    );
}

interface EqualizerPanelProps {
    state: EqualizerState;
    sampleRate: number;
    isDisabled: boolean;
    onStateChange: (state: EqualizerState) => void;
    onApply: () => void;
}

/**
 * A 10-band graphic equalizer and a gain. Preview plays the sample through it, and Apply
 * changes the audio (and the other half of a stereo pair).
 */
export function EqualizerPanel({
    state,
    sampleRate,
    isDisabled,
    onStateChange,
    onApply
}: EqualizerPanelProps) {
    const { t } = useTranslation();
    const { settings, isPreviewing } = state;
    const isSettingsFlat = isFlat(settings);
    // Bands at or above this sample's Nyquist frequency change nothing, so Apply would only
    // make an undo step (and decompress a compressed sample)
    const isEffectFlat = isFlat({
        gain: settings.gain,
        bands: getBandGains(settings, sampleRate)
    });
    const setBand = (index: number, gain: number) =>
        onStateChange({
            ...state,
            settings: {
                ...settings,
                bands: settings.bands.with(index, gain)
            }
        });

    const buttonClass = "pretty_button responsive_button hover_brightness";
    return (
        <section
            className={"equalizer"}
            aria-label={t("sampleLocale.equalizer.title")}
        >
            <div className={"equalizer_header"}>
                <h3>{t("sampleLocale.equalizer.title")}</h3>
                <button
                    type={"button"}
                    className={buttonClass}
                    aria-pressed={isPreviewing}
                    onClick={() =>
                        onStateChange({ ...state, isPreviewing: !isPreviewing })
                    }
                >
                    {t("sampleLocale.equalizer.preview")}
                </button>
                <button
                    type={"button"}
                    className={buttonClass}
                    disabled={isSettingsFlat}
                    onClick={() =>
                        onStateChange({ ...state, settings: FLAT_EQUALIZER })
                    }
                >
                    {t("sampleLocale.equalizer.reset")}
                </button>
                <button
                    type={"button"}
                    className={buttonClass}
                    disabled={isEffectFlat || isDisabled}
                    onClick={onApply}
                >
                    {t("sampleLocale.equalizer.apply")}
                </button>
            </div>
            <div className={"equalizer_body"}>
                <div className={"equalizer_bands"}>
                    <EqualizerCurve
                        settings={settings}
                        sampleRate={sampleRate}
                    />
                    {EQ_FREQUENCIES.map((frequency, i) => (
                        <EqualizerSlider
                            key={frequency}
                            value={settings.bands[i] ?? 0}
                            max={EQ_MAX_BAND_GAIN}
                            label={formatFrequency(frequency)}
                            ariaLabel={t("sampleLocale.equalizer.band", {
                                frequency
                            })}
                            // A band at or above the Nyquist frequency has nothing to change
                            isDisabled={frequency >= sampleRate / 2}
                            onChange={(gain) => setBand(i, gain)}
                        />
                    ))}
                </div>
                <EqualizerSlider
                    value={settings.gain}
                    max={EQ_MAX_GAIN}
                    label={t("sampleLocale.equalizer.gain")}
                    ariaLabel={t("sampleLocale.equalizer.gainDb")}
                    isDisabled={false}
                    onChange={(gain) =>
                        onStateChange({
                            ...state,
                            settings: { ...settings, gain }
                        })
                    }
                />
            </div>
        </section>
    );
}
