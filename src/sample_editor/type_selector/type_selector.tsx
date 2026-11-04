import { type SampleType, SampleTypes } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import type { SampleView } from "../../core_backend/entity_views.ts";

const NO_LINK = "none";

interface TypeSelectorProps {
    sample: SampleView;
    samples: readonly SampleView[];
    /**
     * The new type and the id of the other half of the pair, if any.
     */
    onChange: (type: SampleType, linkedSampleId?: number) => void;
}

/**
 * The sample type (mono, left, or right) and the other sample of a stereo pair.
 */
export function TypeSelector({ sample, samples, onChange }: TypeSelectorProps) {
    const { t } = useTranslation();
    const { type: sampleType, linkedSampleId } = sample;
    // Samples that are free to pair with this one
    const available = samples.filter(
        (s) =>
            s.id !== sample.id &&
            (s.linkedSampleId === undefined || s.linkedSampleId === sample.id)
    );
    const isNothingToLink =
        available.length === 0 ||
        (available.length < 2 && linkedSampleId !== undefined);

    const setType = (type: SampleType) => {
        if (
            type === SampleTypes.leftSample ||
            type === SampleTypes.rightSample
        ) {
            onChange(type, linkedSampleId ?? available[0]?.id);
        } else {
            onChange(type);
        }
    };

    return (
        <>
            <div className={"info_field"}>
                <span>{t("sampleLocale.type")}</span>
                <select
                    className={"pretty_input monospaced"}
                    aria-label={t("sampleLocale.type")}
                    value={sampleType}
                    onChange={(e) =>
                        setType(Number.parseInt(e.target.value) as SampleType)
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
                            isNothingToLink &&
                            sampleType !== SampleTypes.rightSample
                        }
                        value={SampleTypes.leftSample}
                    >
                        {t("sampleLocale.types.left")}
                    </option>
                    <option
                        disabled={
                            isNothingToLink &&
                            sampleType !== SampleTypes.leftSample
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
            <div className={"info_field"}>
                <span>{t("sampleLocale.link")}</span>
                <select
                    disabled={linkedSampleId === undefined}
                    className={"pretty_input monospaced"}
                    aria-label={t("sampleLocale.link")}
                    value={
                        linkedSampleId === undefined
                            ? NO_LINK
                            : String(linkedSampleId)
                    }
                    onChange={(e) =>
                        onChange(
                            sampleType,
                            available.find(
                                (s) => String(s.id) === e.target.value
                            )?.id
                        )
                    }
                >
                    <option value={NO_LINK}>-</option>
                    {available.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                            {s.name}
                        </option>
                    ))}
                </select>
            </div>
        </>
    );
}
