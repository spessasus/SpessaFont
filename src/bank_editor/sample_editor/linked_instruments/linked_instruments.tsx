import { t } from "i18next";
import { BasicInstrument, type BasicSample } from "spessasynth_core";
import type { BankEditView } from "../../../core_backend/sound_bank_manager.ts";
import "./linked_instruments.css";

export function LinkedInstruments({
    sample,
    setView
}: {
    sample: BasicSample;
    setView: (v: BankEditView) => unknown;
}) {
    const linked = new Set<BasicInstrument>();
    sample.linkedInstruments.forEach((i) => linked.add(i));
    return (
        <div className={"linked_instruments"}>
            {sample.linkedInstruments.length === 0 && (
                <div>{t("sampleLocale.notLinkedToInstrument")}:</div>
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
