import type { midiControllers } from "spessasynth_core";
import { modulatorSources } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import type { ChangeEvent, JSX } from "react";
import "./source_picker.css";

export type ModulatorSource = {
    usesCC: boolean;
    sourceIndex: modulatorSources | midiControllers;
};

export function ModulatorSourcePicker({
    source,
    setSource,
    ccOptions
}: {
    source: ModulatorSource;
    setSource: (s: ModulatorSource) => void;
    ccOptions: JSX.Element;
}) {
    const { t } = useTranslation();
    const isCC = source.usesCC;
    const selectValue = isCC
        ? source.sourceIndex.toString()
        : (-source.sourceIndex).toString();

    const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const num = parseInt(e.target.value);

        if (num >= 0) {
            setSource({ usesCC: true, sourceIndex: num });
        } else {
            setSource({
                usesCC: false,
                sourceIndex: -num
            });
        }
    };

    return (
        <select
            className="source_picker pretty_outline monospaced"
            onChange={handleSelectChange}
            value={selectValue}
        >
            <option value={-modulatorSources.noController}>
                {t("modulatorLocale.sources.noController")}
            </option>
            <option value={-modulatorSources.noteOnVelocity}>
                {t("modulatorLocale.sources.velocity")}
            </option>
            <option value={-modulatorSources.noteOnKeyNum}>
                {t("modulatorLocale.sources.midiNote")}
            </option>
            <option value={-modulatorSources.polyPressure}>
                {t("modulatorLocale.sources.polyPressure")}
            </option>
            <option value={-modulatorSources.channelPressure}>
                {t("modulatorLocale.sources.channelPressure")}
            </option>
            <option value={-modulatorSources.pitchWheel}>
                {t("modulatorLocale.sources.pitchWheel")}
            </option>
            <option value={-modulatorSources.pitchWheelRange}>
                {t("modulatorLocale.sources.pitchWheelRange")}
            </option>
            {ccOptions}
        </select>
    );
}
