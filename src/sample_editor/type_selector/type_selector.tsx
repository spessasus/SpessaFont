import {
    type BasicSample,
    type SampleType,
    SampleTypes
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

    const availableSamples = useMemo(() => {
        const indexedSamples: { s: BasicSample; i: number }[] = [];

        for (let i = 0; i < samples.length; i++) {
            const s = samples[i];
            if (
                (s.linkedSample === undefined || s.linkedSample === sample) &&
                s !== sample
            ) {
                indexedSamples.push({ s, i });
            }
        }

        return indexedSamples;
    }, [sample, samples]);

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
        availableSamples.length === 0 ||
        (availableSamples.length < 2 && linkedSample);

    const setType = (t: SampleType) => {
        const linked: BasicSample = linkedSample ?? samples[0];
        switch (t) {
            case SampleTypes.rightSample:
            case SampleTypes.leftSample:
            case SampleTypes.linkedSample: {
                setLinkedSample(t, linked);
                break;
            }

            default: {
                // set to mono unlinked
                setLinkedSample(t);
            }
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
                            nothingToLink &&
                            sampleType !== SampleTypes.rightSample
                        }
                        value={SampleTypes.leftSample}
                    >
                        {t("sampleLocale.types.left")}
                    </option>
                    <option
                        disabled={
                            nothingToLink &&
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
                    value={linkedSample === undefined ? -1 : linkedIndex}
                    onChange={(e) =>
                        setLinkedSample(
                            sampleType,
                            samples[Number.parseInt(e.target.value)]
                        )
                    }
                >
                    {sampleElements}
                </select>
            </div>
        </>
    );
}
