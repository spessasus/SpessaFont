import { ModulatorControllerSources } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import type { ChangeEvent } from "react";
import "./source_picker.css";
import { OptionList } from "../../utils/translated_options/option_list.tsx";
import { useTranslatedOptions } from "../../utils/translated_options/translated_options_context.ts";
import {
    fromSourceOptionValue,
    NON_CC_SOURCES,
    type SpessaFontModulatorSource,
    toSourceOptionValue
} from "./source_option_value.ts";

export type { SpessaFontModulatorSource } from "./source_option_value.ts";

const NON_CC_SOURCE_LABELS = {
    [ModulatorControllerSources.noController]:
        "modulatorLocale.sources.noController",
    [ModulatorControllerSources.noteOnVelocity]:
        "modulatorLocale.sources.velocity",
    [ModulatorControllerSources.noteOnKeyNum]:
        "modulatorLocale.sources.midiNote",
    [ModulatorControllerSources.polyPressure]:
        "modulatorLocale.sources.polyPressure",
    [ModulatorControllerSources.channelPressure]:
        "modulatorLocale.sources.channelPressure",
    [ModulatorControllerSources.pitchWheel]:
        "modulatorLocale.sources.pitchWheel",
    [ModulatorControllerSources.pitchWheelRange]:
        "modulatorLocale.sources.pitchWheelRange"
} as const;

interface ModulatorSourcePickerProps {
    label: string;
    source: SpessaFontModulatorSource;
    onChange: (s: SpessaFontModulatorSource) => void;
}

export function ModulatorSourcePicker({
    label,
    source,
    onChange
}: ModulatorSourcePickerProps) {
    const { t } = useTranslation();
    const { controllers } = useTranslatedOptions();
    const selectValue = toSourceOptionValue(source);
    // A source the lists do not offer (a modulator link, an illegal CC) still shows as itself
    const isListed = source.usesCC
        ? controllers.some((c) => c.value === source.sourceIndex)
        : NON_CC_SOURCES.some((s) => s === source.sourceIndex);
    let unlistedLabel = "";
    if (!isListed) {
        unlistedLabel = source.usesCC
            ? t("modulatorLocale.sources.otherController", {
                  number: source.sourceIndex
              })
            : source.sourceIndex === ModulatorControllerSources.link
              ? t("modulatorLocale.sources.link")
              : t("modulatorLocale.sources.otherSource", {
                    number: source.sourceIndex
                });
    }

    const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>) =>
        onChange(fromSourceOptionValue(e.target.value));

    return (
        <select
            className="source_picker pretty_outline monospaced"
            aria-label={label}
            onChange={handleSelectChange}
            value={selectValue}
        >
            {isListed ? null : (
                <option value={selectValue}>{unlistedLabel}</option>
            )}
            {NON_CC_SOURCES.map((index) => (
                <option
                    key={index}
                    value={toSourceOptionValue({
                        usesCC: false,
                        sourceIndex: index
                    })}
                >
                    {t(NON_CC_SOURCE_LABELS[index])}
                </option>
            ))}
            <OptionList options={controllers} />
        </select>
    );
}
