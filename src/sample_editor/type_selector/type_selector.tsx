import { type SampleType, SampleTypes } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import type { SampleView } from "../../core_backend/entity_views.ts";

interface TypeSelectorProps {
    sample: SampleView;
    /**
     * The name of the other half of the pair, if any.
     */
    partnerName: string | undefined;
    /**
     * Whether another sample is free to pair with this one.
     */
    canLink: boolean;
    onTypeChange: (type: SampleType) => void;
    /**
     * Asks for the other half of the pair.
     */
    onPickPartner: () => void;
}

/**
 * The sample type (mono, left, or right) and the other sample of a stereo pair. The partner is
 * picked in a searchable dialog, so the bank's samples are not all rendered here.
 */
export function TypeSelector({
    sample,
    partnerName,
    canLink,
    onTypeChange,
    onPickPartner
}: TypeSelectorProps) {
    const { t } = useTranslation();
    const sampleType = sample.type;
    const partnerLabel = partnerName ?? t("sampleLocale.unlinked");

    return (
        <>
            <div className={"sample_editor_field"}>
                <span>{t("sampleLocale.type")}</span>
                <select
                    className={"pretty_input monospaced"}
                    aria-label={t("sampleLocale.type")}
                    value={sampleType}
                    onChange={(e) =>
                        onTypeChange(
                            Number.parseInt(e.target.value) as SampleType
                        )
                    }
                >
                    <option disabled={true} value={0}>
                        {t("sampleLocale.types.invalid")}
                    </option>
                    <option value={SampleTypes.monoSample}>
                        {t("sampleLocale.types.mono")}
                    </option>
                    <option
                        disabled={
                            !canLink && sampleType !== SampleTypes.rightSample
                        }
                        value={SampleTypes.leftSample}
                    >
                        {t("sampleLocale.types.left")}
                    </option>
                    <option
                        disabled={
                            !canLink && sampleType !== SampleTypes.leftSample
                        }
                        value={SampleTypes.rightSample}
                    >
                        {t("sampleLocale.types.right")}
                    </option>
                    <option disabled={true} value={SampleTypes.linkedSample}>
                        {t("sampleLocale.types.linked")}
                    </option>
                    <option disabled={true} value={SampleTypes.romMonoSample}>
                        {t("sampleLocale.types.romMono")}
                    </option>
                    <option disabled={true} value={SampleTypes.romLeftSample}>
                        {t("sampleLocale.types.romLeft")}
                    </option>
                    <option disabled={true} value={SampleTypes.romRightSample}>
                        {t("sampleLocale.types.romRight")}
                    </option>
                    <option disabled={true} value={SampleTypes.romLinkedSample}>
                        {t("sampleLocale.types.romLinked")}
                    </option>
                </select>
            </div>
            <div className={"sample_editor_field"}>
                <span>{t("sampleLocale.link")}</span>
                <button
                    type={"button"}
                    disabled={!canLink}
                    className={"pretty_input monospaced sample_link_button"}
                    aria-label={`${t("sampleLocale.link")}: ${partnerLabel}`}
                    title={partnerLabel}
                    onClick={onPickPartner}
                >
                    {partnerLabel}
                </button>
            </div>
        </>
    );
}
