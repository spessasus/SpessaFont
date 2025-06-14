import { BasicInstrument, type BasicSample } from "spessasynth_core";
import "./linked_instruments.css";
import type { SetViewType } from "../../bank_editor.tsx";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";

import { DeleteSampleAction } from "./delete_sample_action.ts";
import type SoundBankManager from "../../../core_backend/sound_bank_manager.ts";

export function LinkedInstruments({
    sample,
    setView,
    samples,
    setSamples,
    manager
}: {
    manager: SoundBankManager;
    sample: BasicSample;
    setView: SetViewType;
    samples: BasicSample[];
    setSamples: (s: BasicSample[]) => void;
}) {
    const { t } = useTranslation();
    const linked = useMemo(() => {
        const l = new Set<BasicInstrument>();
        sample.linkedInstruments.forEach((i) => l.add(i));
        return l;
    }, [sample.linkedInstruments]);

    const deleteSample = () => {
        const mainIndex = samples.indexOf(sample);
        const actions = [
            new DeleteSampleAction(mainIndex, setSamples, setView)
        ];
        // delete the other one too if linked and unused
        if (sample?.linkedSample?.useCount === 0) {
            let index = samples.indexOf(sample.linkedSample);
            if (index > mainIndex) {
                index--;
            }
            actions.push(new DeleteSampleAction(index, setSamples, setView));
        }
        manager.modifyBank(actions);
    };

    return (
        <div className={"linked_instruments"}>
            {sample.isCompressed && (
                <div>
                    <strong style={{ color: "red" }}>
                        {t("sampleLocale.compressedSample")}
                    </strong>
                </div>
            )}
            {sample.linkedInstruments.length === 0 && (
                <>
                    <div>
                        <strong>
                            {t("sampleLocale.notLinkedToInstrument")}
                        </strong>
                    </div>
                    <div onClick={deleteSample}>
                        {t("sampleLocale.deleteSample")}
                    </div>
                </>
            )}
            {sample.linkedInstruments.length > 0 && (
                <>
                    <div>
                        <b>{t("sampleLocale.linkedTo")}</b>
                    </div>
                    {Array.from(linked).map((inst, i) => (
                        <div
                            className={"monospaced"}
                            onClick={() => setView(inst)}
                            key={i}
                        >
                            {inst.instrumentName}
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}
