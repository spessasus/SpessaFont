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

    const handleMidiCCChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const input = e.target.value;
        const value = parseInt(input);
        setSource({ usesCC: true, sourceIndex: value });
    };

    return (
        <div className="source_picker pretty_outline">
            <select
                onChange={handleSelectChange}
                value={selectValue}
                className={"monospaced"}
            >
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
                <select
                    className="midi_cc_selector monospaced"
                    value={source.sourceIndex}
                    onChange={handleMidiCCChange}
                >
                    {ccOptions}
                </select>
            )}

            {!isCC && (
                // phantom input to even out the width
                <input
                    className="monospaced"
                    style={{ width: "8ch" }}
                    disabled={true}
                />
            )}
        </div>
    );
}
