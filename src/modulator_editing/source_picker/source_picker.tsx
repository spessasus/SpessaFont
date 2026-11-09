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
import { getSourceLabel, NON_CC_SOURCE_LABELS } from "./source_label.ts";

export type { SpessaFontModulatorSource } from "./source_option_value.ts";

interface SourcePickerProps {
    label: string;
    source: SpessaFontModulatorSource;
    onChange: (s: SpessaFontModulatorSource) => void;
}

export function SourcePicker({ label, source, onChange }: SourcePickerProps) {
    const { t } = useTranslation();
    const { controllers } = useTranslatedOptions();
    const selectValue = toSourceOptionValue(source);
    // A source the lists do not offer (a modulator link, an illegal CC) still shows as itself
    const isListed = source.usesCC
        ? controllers.some((c) => c.value === source.sourceIndex)
        : NON_CC_SOURCES.some((s) => s === source.sourceIndex);
    const unlistedLabel = isListed
        ? ""
        : getSourceLabel(source, controllers, t);

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
