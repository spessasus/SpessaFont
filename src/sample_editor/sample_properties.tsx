import type { SampleView } from "../core_backend/entity_views.ts";
import { useTranslation } from "react-i18next";
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
     * Every sample of the bank, for the stereo link.
     */
    samples: readonly SampleView[];
    edits: ReturnType<typeof useSampleEdits>;
}

/**
 * The editable fields of a sample: rate, loop points, tuning, and stereo link.
 */
export function SampleProperties({
    sample,
    samples,
    edits
}: SamplePropertiesProps) {
    const { t } = useTranslation();
    const { loopStart, loopEnd, originalKey, length } = sample;
    return (
        <div className={"sample_properties"}>
            <div className={"info_field"}>
                <span>{t("sampleLocale.sampleRate")}</span>
                <WaitingInput
                    setValue={edits.setSampleRate}
                    value={sample.sampleRate}
                    className={"pretty_input monospaced"}
                    type={"number"}
                    min={MIN_SAMPLE_RATE}
                    max={MAX_SAMPLE_RATE}
                    aria-label={t("sampleLocale.sampleRate")}
                />
            </div>

            <div className={"info_field"}>
                <span>{t("sampleLocale.loopStart")}</span>
                <WaitingInput
                    setValue={edits.setLoopStart}
                    value={loopStart}
                    className={"pretty_input monospaced"}
                    type={"number"}
                    min={0}
                    max={loopEnd}
                    aria-label={t("sampleLocale.loopStart")}
                />
            </div>

            <div className={"info_field"}>
                <span>{t("sampleLocale.loopEnd")}</span>
                <WaitingInput
                    setValue={edits.setLoopEnd}
                    value={loopEnd}
                    className={"pretty_input monospaced"}
                    type={"number"}
                    min={loopStart}
                    max={length}
                    aria-label={t("sampleLocale.loopEnd")}
                />
            </div>

            <div className={"info_field"}>
                <span>{t("sampleLocale.originalKey")}</span>
                <WaitingInput
                    setValue={edits.setOriginalKey}
                    value={originalKey}
                    className={"pretty_input monospaced"}
                    maxLength={7}
                    suffix={` (${midiNoteToPitchClass(originalKey)})`}
                    aria-label={t("sampleLocale.originalKey")}
                />
            </div>

            <div className={"info_field"}>
                <span>{t("sampleLocale.centCorrection")}</span>
                <WaitingInput
                    setValue={edits.setCentCorrection}
                    value={sample.pitchCorrection}
                    className={"pretty_input monospaced"}
                    type={"number"}
                    min={-99}
                    max={99}
                    aria-label={t("sampleLocale.centCorrection")}
                />
            </div>

            <TypeSelector
                sample={sample}
                samples={samples}
                onChange={edits.setLinkedSample}
            />
        </div>
    );
}
