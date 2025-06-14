import {
    type BasicSample,
    sampleTypes,
    type SampleTypeValue
} from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";

export function TypeSelector({
    sampleType,
    linkedSample,
    setLinkedSample,
    samples
}: {
    sampleType: SampleTypeValue;
    linkedSample: BasicSample | undefined;
    setLinkedSample: (type: SampleTypeValue, s?: BasicSample) => void;
    samples: BasicSample[];
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
                indexedSamples.push({ s, i });
                return indexedSamples;
            }, Array<{ s: BasicSample; i: number }>()),
        [samples]
    );

    const sampleElements = useMemo(
        () => (
            <>
                <option value={-1}>-</option>
                {availableSamples.map((sam, i) => (
                    <option value={sam.i} key={i}>
                        {sam.s.sampleName}
                    </option>
                ))}
            </>
        ),
        [availableSamples]
    );

    const setType = (t: SampleTypeValue) => {
        const linked: BasicSample = linkedSample || samples[0];
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
                        setType(parseInt(e.target.value) as SampleTypeValue)
                    }
                >
                    <option value={sampleTypes.monoSample}>
                        {t("sampleLocale.types.mono")}
                    </option>
                    <option value={sampleTypes.leftSample}>
                        {t("sampleLocale.types.left")}
                    </option>
                    <option value={sampleTypes.rightSample}>
                        {t("sampleLocale.types.right")}
                    </option>
                    <option value={sampleTypes.linkedSample}>
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
