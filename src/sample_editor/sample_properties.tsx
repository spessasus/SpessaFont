import "./sample_properties_phone.css";
import type { SampleView } from "../core_backend/entity_views.ts";
import { useTranslation } from "react-i18next";
import { useLayout } from "../layout/layout_context.ts";
import { WaitingInput } from "../fancy_inputs/waiting_input/waiting_input.tsx";
import { TypeSelector } from "./type_selector/type_selector.tsx";
import { midiNoteToPitchClass } from "../utils/note_name.ts";
import {
    MAX_SAMPLE_RATE,
    MIN_SAMPLE_RATE,
    type useSampleEdits
} from "./use_sample_edits.ts";

interface SamplePropertiesProps {
    sample: SampleView;
    /**
     * The name of the other half of a stereo pair, if any.
     */
    partnerName: string | undefined;
    /**
     * Whether another sample is free to pair with this one.
     */
    canLink: boolean;
    edits: ReturnType<typeof useSampleEdits>;
}

/**
 * The editable fields of a sample: rate, loop points, tuning, and stereo link.
 */
export function SampleProperties({
    sample,
    partnerName,
    canLink,
    edits
}: SamplePropertiesProps) {
    const { t } = useTranslation();
    const layout = useLayout();
    const { loopStart, loopEnd, originalKey, length } = sample;
    // With the octave, C4 being middle C (60) as on the keyboard
    const noteName = `${midiNoteToPitchClass(originalKey)}${Math.floor(originalKey / 12) - 1}`;
    return (
        <div className={"sample_properties"}>
            <div className={"sample_editor_field"}>
                <span>{t("sampleLocale.sampleRate")}</span>
                <WaitingInput
                    onCommit={edits.setSampleRate}
                    value={sample.sampleRate}
                    className={"pretty_input monospaced"}
                    type={"number"}
                    min={MIN_SAMPLE_RATE}
                    max={MAX_SAMPLE_RATE}
                    inputMode={"numeric"}
                    aria-label={t("sampleLocale.sampleRate")}
                />
            </div>

            {/* The phone's Loop section edits the loop points */}
            {layout === "phone" ? null : (
                <>
                    <div className={"sample_editor_field"}>
                        <span>{t("sampleLocale.loopStart")}</span>
                        <WaitingInput
                            onCommit={edits.setLoopStart}
                            value={loopStart}
                            className={"pretty_input monospaced"}
                            type={"number"}
                            min={0}
                            max={loopEnd}
                            inputMode={"numeric"}
                            aria-label={t("sampleLocale.loopStart")}
                        />
                    </div>

                    <div className={"sample_editor_field"}>
                        <span>{t("sampleLocale.loopEnd")}</span>
                        <WaitingInput
                            onCommit={edits.setLoopEnd}
                            value={loopEnd}
                            className={"pretty_input monospaced"}
                            type={"number"}
                            min={loopStart}
                            max={length}
                            inputMode={"numeric"}
                            aria-label={t("sampleLocale.loopEnd")}
                        />
                    </div>
                </>
            )}

            <div className={"sample_editor_field"}>
                {/* The note goes in the label, in the field it would count toward the digits */}
                <span>{`${t("sampleLocale.originalKey")} (${noteName})`}</span>
                <WaitingInput
                    onCommit={edits.setOriginalKey}
                    value={originalKey}
                    className={"pretty_input monospaced"}
                    type={"number"}
                    min={0}
                    max={127}
                    inputMode={"numeric"}
                    aria-label={t("sampleLocale.originalKey")}
                />
            </div>

            <div className={"sample_editor_field"}>
                <span>{t("sampleLocale.centCorrection")}</span>
                <WaitingInput
                    onCommit={edits.setCentCorrection}
                    value={sample.pitchCorrection}
                    className={"pretty_input monospaced"}
                    type={"number"}
                    min={-99}
                    max={99}
                    inputMode={"text"}
                    aria-label={t("sampleLocale.centCorrection")}
                />
            </div>

            <TypeSelector
                sample={sample}
                partnerName={partnerName}
                canLink={canLink}
                onTypeChange={edits.setType}
                onPickPartner={edits.pickLinkedSample}
            />
        </div>
    );
}
