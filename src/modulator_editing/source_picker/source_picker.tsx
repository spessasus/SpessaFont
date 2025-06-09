import type { midiControllers } from "spessasynth_core";
import { modulatorSources } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import type { ChangeEvent } from "react";
import "./source_picker.css";
import { ILLEGAL_CC_DESTINATIONS } from "../../core_backend/midi_constants.ts";

export type ModulatorSource = {
    usesCC: boolean;
    sourceIndex: modulatorSources | midiControllers;
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
        const input = e.target.value;
        const match = input.match(/^CC#(\d{1,3})$/);

        if (match) {
            const cc = parseInt(match[1], 10);
            if (cc >= 0 && cc <= 127 && !ILLEGAL_CC_DESTINATIONS.includes(cc)) {
                setSource({ usesCC: true, sourceIndex: cc });
            }
        } else if (input === "CC#") {
            setSource({ usesCC: true, sourceIndex: 0 });
        }
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
                    type="text"
                    value={`CC#${source.sourceIndex}`}
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
