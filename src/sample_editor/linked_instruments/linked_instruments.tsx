import type { BasicSample } from "spessasynth_core";
import "../../bank_editor/bottom_bar.css";
import { useTranslation } from "react-i18next";

import { DeleteSampleAction } from "./delete_sample_action.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { getObjectId } from "../../utils/object_id.ts";

interface LinkedInstrumentsProps {
    sample: BasicSample;
}

export function LinkedInstruments({ sample }: LinkedInstrumentsProps) {
    const { t } = useTranslation();
    const { apply, setView } = useBankEditor();
    // An instrument with several zones of this sample is listed once
    const linked = new Set(sample.linkedTo);

    const deleteSample = () => {
        const actions = [new DeleteSampleAction(sample)];
        // delete the other one too if linked and unused
        if (sample.linkedSample?.useCount === 0) {
            actions.push(new DeleteSampleAction(sample.linkedSample));
        }
        apply(actions);
    };

    return (
        <div className={"bottom_bar"}>
            {sample.isCompressed && (
                <div>
                    <strong>
                        <i className={"warning"}>
                            {t("sampleLocale.compressedSample")}
                        </i>
                    </strong>
                </div>
            )}
            {sample.linkedTo.length === 0 && (
                <>
                    <div>
                        <strong>
                            {t("sampleLocale.notLinkedToInstrument")}
                        </strong>
                    </div>
                    <button
                        type={"button"}
                        onClick={deleteSample}
                        className={"plain_button warning"}
                    >
                        {t("sampleLocale.deleteSample")}
                    </button>
                </>
            )}
            {sample.linkedTo.length > 0 && (
                <>
                    <div>{t("sampleLocale.usedBy")}:</div>
                    {Array.from(linked, (inst) => (
                        <button
                            type={"button"}
                            className={"plain_button monospaced"}
                            onClick={() => setView(inst)}
                            key={getObjectId(inst)}
                        >
                            {inst.name}
                        </button>
                    ))}
                </>
            )}
        </div>
    );
}
