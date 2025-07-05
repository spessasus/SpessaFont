import { BasicInstrument, type BasicSample } from "spessasynth_core";
import "../../bank_editor/bottom_bar.css";
import type { SetViewType } from "../../bank_editor/bank_editor.tsx";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";

import { DeleteSampleAction } from "./delete_sample_action.ts";
import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";

export function LinkedInstruments({
    sample,
    setView,
    setSamples,
    manager
}: {
    manager: SoundBankManager;
    sample: BasicSample;
    setView: SetViewType;
    setSamples: (s: BasicSample[]) => void;
}) {
    const { t } = useTranslation();
    const linked = useMemo(() => {
        const l = new Set<BasicInstrument>();
        sample.linkedInstruments.forEach((i) => l.add(i));
        return l;
    }, [sample.linkedInstruments]);

    const deleteSample = () => {
        const actions = [new DeleteSampleAction(sample, setSamples, setView)];
        // delete the other one too if linked and unused
        if (sample?.linkedSample?.useCount === 0) {
            actions.push(
                new DeleteSampleAction(sample.linkedSample, setSamples, setView)
            );
        }
        manager.modifyBank(actions);
    };

    return (
        <div className={"bottom_bar"}>
            {sample.isCompressed && (
                <div>
                    <strong>
                        <i>{t("sampleLocale.compressedSample")}</i>
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
                    <div onClick={deleteSample} className={"warning"}>
                        {t("sampleLocale.deleteSample")}
                    </div>
                </>
            )}
            {sample.linkedInstruments.length > 0 && (
                <>
                    <div>{t("sampleLocale.usedBy")}:</div>
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
