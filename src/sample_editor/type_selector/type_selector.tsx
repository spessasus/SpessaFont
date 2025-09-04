import {
    type BasicSample,
    type SampleType,
    sampleTypes
} from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";

export function TypeSelector({
    sampleType,
    linkedSample,
    setLinkedSample,
    samples,
    sample
}: {
    sampleType: SampleType;
    linkedSample: BasicSample | undefined;
    setLinkedSample: (type: SampleType, s?: BasicSample) => void;
    samples: BasicSample[];
    sample: BasicSample;
}) {
    const { t } = useTranslation();
    const linkedIndex = useMemo(() => {
        if (!linkedSample) {
            return 0;
        }
        return samples.indexOf(linkedSample);
    }, [linkedSample, samples]);

    const availableSamples = useMemo(
        () =>
            samples.reduce((indexedSamples, s, i) => {
                if (
                    (s.linkedSample === undefined ||
                        s.linkedSample === sample) &&
                    s !== sample
                ) {
                    indexedSamples.push({ s, i });
                }
                return indexedSamples;
            }, Array<{ s: BasicSample; i: number }>()),
        [sample, samples]
    );

    const sampleElements = useMemo(
        () => (
            <>
                <option value={-1}>-</option>
                {availableSamples.map((sam, i) => (
                    <option value={sam.i} key={i}>
                        {sam.s.name}
                    </option>
                ))}
            </>
        ),
        [availableSamples]
    );

    const nothingToLink =
        availableSamples.length < 1 ||
        (availableSamples.length < 2 && linkedSample);

    const setType = (t: SampleType) => {
        const linked: BasicSample = linkedSample ?? samples[0];
        switch (t) {
            case sampleTypes.rightSample:
            case sampleTypes.leftSample:
            case sampleTypes.linkedSample:
                setLinkedSample(t, linked);
                break;

            default:
                // set to mono unlinked
                setLinkedSample(t);
        }
    };
    return (
        <>
            <div className={"info_field"}>
                <span>{t("sampleLocale.type")}</span>
                <select
                    className={"pretty_input monospaced"}
                    value={sampleType}
                    onChange={(e) =>
                        setType(parseInt(e.target.value) as SampleType)
                    }
                >
                    <option disabled={true} value={0}>
                        {t("sampleLocale.types.invalid")}
                    </option>
                    <option value={sampleTypes.monoSample}>
                        {t("sampleLocale.types.mono")}
                    </option>
                    <option
                        disabled={
                            nothingToLink &&
                            sampleType !== sampleTypes.rightSample
                        }
                        value={sampleTypes.leftSample}
                    >
                        {t("sampleLocale.types.left")}
                    </option>
                    <option
                        disabled={
                            nothingToLink &&
                            sampleType !== sampleTypes.leftSample
                        }
                        value={sampleTypes.rightSample}
                    >
                        {t("sampleLocale.types.right")}
                    </option>
                    <option disabled={true} value={sampleTypes.linkedSample}>
                        {t("sampleLocale.types.linked")}
                    </option>

                    <option disabled={true} value={sampleTypes.romMonoSample}>
                        {t("sampleLocale.types.romMono")}
                    </option>
                    <option disabled={true} value={sampleTypes.romLeftSample}>
                        {t("sampleLocale.types.romLeft")}
                    </option>
                    <option disabled={true} value={sampleTypes.romRightSample}>
                        {t("sampleLocale.types.romRight")}
                    </option>
                    <option disabled={true} value={sampleTypes.romLinkedSample}>
                        {t("sampleLocale.types.romLinked")}
                    </option>
                </select>
            </div>
            <div className={"info_field"}>
                <span>{t("sampleLocale.link")}</span>
                <select
                    disabled={linkedSample === undefined}
                    className={"pretty_input monospaced"}
                    value={linkedSample === undefined ? -1 : linkedIndex}
                    onChange={(e) =>
                        setLinkedSample(
                            sampleType,
                            samples[parseInt(e.target.value)]
                        )
                    }
                >
                    {sampleElements}
                </select>
            </div>
        </>
    );
}
