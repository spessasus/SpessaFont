import {
    type BasicSample,
    type SampleType,
    SampleTypes
} from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { getObjectId } from "../../utils/object_id.ts";

const NO_LINK = "none";

interface TypeSelectorProps {
    sample: BasicSample;
    samples: readonly BasicSample[];
    onChange: (type: SampleType, linkedSample?: BasicSample) => void;
}

/**
 * The sample type (mono, left, or right) and the other sample of a stereo pair.
 */
export function TypeSelector({ sample, samples, onChange }: TypeSelectorProps) {
    const { t } = useTranslation();
    const { sampleType, linkedSample } = sample;
    // Samples that are free to pair with this one
    const available = samples.filter(
        (s) =>
            s !== sample &&
            (s.linkedSample === undefined || s.linkedSample === sample)
    );
    const isNothingToLink =
        available.length === 0 || (available.length < 2 && !!linkedSample);

    const setType = (type: SampleType) => {
        if (
            type === SampleTypes.leftSample ||
            type === SampleTypes.rightSample
        ) {
            onChange(type, linkedSample ?? available[0]);
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
                    disabled={linkedSample === undefined}
                    className={"pretty_input monospaced"}
                    aria-label={t("sampleLocale.link")}
                    value={
                        linkedSample
                            ? String(getObjectId(linkedSample))
                            : NO_LINK
                    }
                    onChange={(e) =>
                        onChange(
                            sampleType,
                            available.find(
                                (s) => String(getObjectId(s)) === e.target.value
                            )
                        )
                    }
                >
                    <option value={NO_LINK}>-</option>
                    {available.map((s) => (
                        <option
                            key={getObjectId(s)}
                            value={String(getObjectId(s))}
                        >
                            {s.name}
                        </option>
                    ))}
                </select>
            </div>
        </>
    );
}
