import "./equalizer_panel_phone.css";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ControllerRange } from "../../fancy_inputs/controller_range/controller_range.tsx";
import { StepperButton } from "../../fancy_inputs/stepper_button/stepper_button.tsx";
import { MinusIcon, PlusIcon } from "../../utils/icons/app_icons.tsx";
import {
    EQ_FREQUENCIES,
    EQ_MAX_BAND_GAIN,
    EQ_MAX_GAIN,
    EQ_STEP,
    type EqualizerBand,
    type EqualizerPanelProps,
    FLAT_EQUALIZER,
    formatFrequency,
    getBandGains,
    getEqualizerBandGain,
    isFlat,
    setEqualizerBand
} from "./equalizer.ts";

function formatBandGain(gain: number) {
    return `${gain > 0 ? "+" : ""}${gain.toFixed(1)}`;
}

/**
 * The phone's equalizer: one button per band picks it, and a card with a slider and steppers
 * edits the picked one, as ten thin vertical sliders do not fit a phone.
 */
export function EqualizerBandPicker({
    state,
    sampleRate,
    isDisabled,
    onStateChange,
    onApply
}: EqualizerPanelProps) {
    const { t } = useTranslation();
    const [band, setBand] = useState<EqualizerBand>(0);
    const { settings, isPreviewing } = state;
    const isSettingsFlat = isFlat(settings);
    const isEffectFlat = isFlat({
        gain: settings.gain,
        bands: getBandGains(settings, sampleRate)
    });
    const setGain = (bandToSet: EqualizerBand, gain: number) =>
        onStateChange({
            ...state,
            settings: setEqualizerBand(settings, bandToSet, gain)
        });

    const isGain = band === "gain";
    const gain = getEqualizerBandGain(settings, band);
    const frequency = isGain ? undefined : EQ_FREQUENCIES[band];
    // A band at or above the Nyquist frequency has nothing to change
    const isBandDisabled =
        frequency !== undefined && frequency >= sampleRate / 2;
    const max = isGain ? EQ_MAX_GAIN : EQ_MAX_BAND_GAIN;
    const buttonClass = "pretty_button responsive_button hover_brightness";

    const bandButtons = [
        ...EQ_FREQUENCIES.map((bandFrequency, i) => ({
            band: i,
            label: formatFrequency(bandFrequency),
            name: t("phoneLocale.sample.hertz", { value: bandFrequency }),
            isDisabled: bandFrequency >= sampleRate / 2
        })),
        {
            band: "gain" as EqualizerBand,
            label: t("sampleLocale.equalizer.gain"),
            name: t("sampleLocale.equalizer.gain"),
            isDisabled: false
        }
    ];

    return (
        <section
            className={"equalizer"}
            aria-label={t("sampleLocale.equalizer.title")}
        >
            <div className={"equalizer_band_grid"}>
                {bandButtons.map((item) => (
                    <button
                        key={item.band}
                        type={"button"}
                        className={`${buttonClass} equalizer_band_button ${item.band === "gain" ? "equalizer_band_gain" : ""}`}
                        // Read as "250 Hz, +3.0 dB" instead of the two spans run together
                        aria-label={`${item.name}, ${t("phoneLocale.sample.decibels", { value: formatBandGain(getEqualizerBandGain(settings, item.band)) })}`}
                        aria-pressed={band === item.band}
                        disabled={item.isDisabled}
                        onClick={() => {
                            setBand(item.band);
                        }}
                        // Android's long press, the desktop's double click
                        onContextMenu={(event) => {
                            event.preventDefault();
                            setGain(item.band, 0);
                        }}
                    >
                        <span>{item.label}</span>
                        <span className={"equalizer_band_value"}>
                            {formatBandGain(
                                getEqualizerBandGain(settings, item.band)
                            )}
                        </span>
                    </button>
                ))}
            </div>
            <p className={"equalizer_hint"}>
                {t("phoneLocale.sample.resetBandHint")}
            </p>
            <div className={"equalizer_card"}>
                <div className={"equalizer_card_heading"}>
                    <span className={"equalizer_card_title"}>
                        {frequency === undefined
                            ? t("sampleLocale.equalizer.gain")
                            : t("phoneLocale.sample.hertz", {
                                  value: frequency
                              })}
                    </span>
                    <span className={"equalizer_card_value"}>
                        {t("phoneLocale.sample.decibels", {
                            value: formatBandGain(gain)
                        })}
                    </span>
                </div>
                <div className={"equalizer_card_row"}>
                    <StepperButton
                        label={t("phoneLocale.sample.gainDown")}
                        steps={-EQ_STEP}
                        isDisabled={isBandDisabled}
                        onStep={(by) => {
                            setGain(band, gain + by);
                        }}
                    >
                        <MinusIcon />
                    </StepperButton>
                    <ControllerRange
                        min={-max}
                        max={max}
                        step={EQ_STEP}
                        value={gain}
                        isDisabled={isBandDisabled}
                        ariaLabel={
                            frequency === undefined
                                ? t("sampleLocale.equalizer.gainDb")
                                : t("sampleLocale.equalizer.band", {
                                      frequency
                                  })
                        }
                        onChange={(value) => {
                            setGain(band, value);
                        }}
                    />
                    <StepperButton
                        label={t("phoneLocale.sample.gainUp")}
                        steps={EQ_STEP}
                        isDisabled={isBandDisabled}
                        onStep={(by) => {
                            setGain(band, gain + by);
                        }}
                    >
                        <PlusIcon />
                    </StepperButton>
                </div>
            </div>
            <div className={"equalizer_actions"}>
                <button
                    type={"button"}
                    className={buttonClass}
                    disabled={isSettingsFlat}
                    onClick={() => {
                        onStateChange({ ...state, settings: FLAT_EQUALIZER });
                    }}
                >
                    {t("sampleLocale.equalizer.reset")}
                </button>
                <button
                    type={"button"}
                    className={buttonClass}
                    aria-pressed={isPreviewing}
                    onClick={() => {
                        onStateChange({
                            ...state,
                            isPreviewing: !isPreviewing
                        });
                    }}
                >
                    {t("sampleLocale.equalizer.preview")}
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
        </section>
    );
}
