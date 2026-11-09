import "../../bank_editor/bottom_bar.css";
import "./linked_instruments_phone.css";
import { useTranslation } from "react-i18next";

import { DeleteSampleAction } from "./delete_sample_action.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { useSampleView } from "../../hooks/use_sample_view.ts";
import { useBankSnapshot } from "../../hooks/use_bank_snapshot.ts";
import { createInstrumentFromSamples } from "../../menu_list/link_actions.ts";

interface LinkedInstrumentsProps {
    /**
     * The sample's view id.
     */
    sampleId: number;
}

export function LinkedInstruments({ sampleId }: LinkedInstrumentsProps) {
    const { t } = useTranslation();
    const { session, apply, setView } = useBankEditor();
    const sample = useSampleView(session.store, sampleId);
    const instruments = useBankSnapshot(
        session.store,
        (s) => s.views.instruments
    );
    if (!sample) {
        return null;
    }
    // An instrument with several zones of this sample is listed once
    const linked = [...new Set(sample.usedBy)];

    const deleteSample = () => {
        const toDelete = session.document.getSample(sampleId);
        if (!toDelete) {
            return;
        }
        const actions = [new DeleteSampleAction(toDelete)];
        // delete the other one too if linked and unused
        if (toDelete.linkedSample?.useCount === 0) {
            actions.push(new DeleteSampleAction(toDelete.linkedSample));
        }
        apply(actions);
    };

    const createInstrument = () => {
        const toLink = session.document.getSample(sampleId);
        if (toLink) {
            apply([createInstrumentFromSamples(session.document, [toLink])]);
        }
    };

    const showInstrument = (id: number) => {
        const instrument = session.document.getInstrument(id);
        if (instrument) {
            setView(instrument);
        }
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
            {linked.length === 0 ? (
                <>
                    <div>
                        <strong>
                            {t("sampleLocale.notLinkedToInstrument")}
                        </strong>
                    </div>
                    <button
                        type={"button"}
                        onClick={createInstrument}
                        className={"plain_button"}
                    >
                        {t("sampleLocale.newInstrumentFromSample")}
                    </button>
                    <button
                        type={"button"}
                        onClick={deleteSample}
                        className={"plain_button warning"}
                    >
                        {t("sampleLocale.deleteSample")}
                    </button>
                </>
            ) : (
                <>
                    <div>{t("sampleLocale.usedBy")}</div>
                    {linked.map((id) => (
                        <button
                            type={"button"}
                            className={"plain_button monospaced"}
                            onClick={() => showInstrument(id)}
                            key={id}
                        >
                            {instruments.get(id)?.name}
                        </button>
                    ))}
                </>
            )}
        </div>
    );
}
