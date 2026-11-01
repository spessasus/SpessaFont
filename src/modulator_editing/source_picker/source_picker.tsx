import {
    ModulatorControllerSources,
    type ModulatorSourceIndex
} from "spessasynth_core";
import { useTranslation } from "react-i18next";
import type { ChangeEvent } from "react";
import "./source_picker.css";
import { OptionList } from "../../utils/translated_options/option_list.tsx";
import { useTranslatedOptions } from "../../utils/translated_options/translated_options_context.ts";

export interface SpessaFontModulatorSource {
    usesCC: boolean;
    sourceIndex: ModulatorSourceIndex;
}

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
    const isCC = source.usesCC;
    const selectValue = isCC
        ? source.sourceIndex.toString()
        : (-source.sourceIndex).toString();

    const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const num = Number.parseInt(e.target.value) as ModulatorSourceIndex;

        if (num >= 0) {
            onChange({ usesCC: true, sourceIndex: num });
        } else {
            onChange({
                usesCC: false,
                sourceIndex: -num as ModulatorSourceIndex
            });
        }
    };

    return (
        <select
            className="source_picker pretty_outline monospaced"
            aria-label={label}
            onChange={handleSelectChange}
            value={selectValue}
        >
            <option value={-ModulatorControllerSources.noController}>
                {t("modulatorLocale.sources.noController")}
            </option>
            <option value={-ModulatorControllerSources.noteOnVelocity}>
                {t("modulatorLocale.sources.velocity")}
            </option>
            <option value={-ModulatorControllerSources.noteOnKeyNum}>
                {t("modulatorLocale.sources.midiNote")}
            </option>
            <option value={-ModulatorControllerSources.polyPressure}>
                {t("modulatorLocale.sources.polyPressure")}
            </option>
            <option value={-ModulatorControllerSources.channelPressure}>
                {t("modulatorLocale.sources.channelPressure")}
            </option>
            <option value={-ModulatorControllerSources.pitchWheel}>
                {t("modulatorLocale.sources.pitchWheel")}
            </option>
            <option value={-ModulatorControllerSources.pitchWheelRange}>
                {t("modulatorLocale.sources.pitchWheelRange")}
            </option>
            <OptionList options={controllers} />
        </select>
    );
}
