import { modulatorSources } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import type { ChangeEvent } from "react";
import "./source_picker.css";

export type ModulatorSource = {
    usesCC: boolean;
    sourceIndex: number;
};

export function ModulatorSourcePicker({
    source,
    setSource
}: {
    source: ModulatorSource;
    setSource: (s: ModulatorSource) => void;
}) {
    const { t } = useTranslation();
    const isCC = source.usesCC;
    const selectValue = isCC ? "controller" : source.sourceIndex.toString();

    const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === "controller") {
            setSource({ usesCC: true, sourceIndex: 1 }); // default to CC1 (mod wheel)
        } else {
            setSource({
                usesCC: false,
                sourceIndex: parseInt(value) || source.sourceIndex
            });
        }
    };

    const handleMidiCCChange = (e: ChangeEvent<HTMLInputElement>) => {
        const cc = parseInt(e.target.value) || source.sourceIndex;
        setSource({ usesCC: true, sourceIndex: cc });
    };

    return (
        <div className="source_picker pretty_outline">
            <select onChange={handleSelectChange} value={selectValue}>
                <option value={modulatorSources.noController}>
                    {t("modulatorLocale.sources.noController")}
                </option>
                <option value={modulatorSources.noteOnVelocity}>
                    {t("modulatorLocale.sources.velocity")}
                </option>
                <option value={modulatorSources.noteOnKeyNum}>
                    {t("modulatorLocale.sources.midiNote")}
                </option>
                <option value={modulatorSources.polyPressure}>
                    {t("modulatorLocale.sources.polyPressure")}
                </option>
                <option value={modulatorSources.channelPressure}>
                    {t("modulatorLocale.sources.channelPressure")}
                </option>
                <option value={modulatorSources.pitchWheel}>
                    {t("modulatorLocale.sources.pitchWheel")}
                </option>
                <option value={modulatorSources.pitchWheelRange}>
                    {t("modulatorLocale.sources.pitchWheelRange")}
                </option>
                <option value="controller">
                    {t("modulatorLocale.sources.midiController")}
                </option>
            </select>
            {isCC && (
                <input
                    className="midi_cc_selector"
                    type="number"
                    min={0}
                    max={127}
                    value={source.sourceIndex}
                    onChange={handleMidiCCChange}
                />
            )}
            {!isCC && (
                // phantom input to even out the width
                <input
                    className="midi_cc_selector"
                    type="number"
                    min={0}
                    max={127}
                    disabled={true}
                />
            )}
        </div>
    );
}
