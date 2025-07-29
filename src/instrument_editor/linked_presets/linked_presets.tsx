import { type BasicInstrument, BasicPreset } from "spessasynth_core";
import "../../bank_editor/bottom_bar.css";
import type { SetViewType } from "../../bank_editor/bank_editor.tsx";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";

import { DeleteInstrumentAction } from "./delete_instrument_action.ts";
import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";
import { WaitingInput } from "../../fancy_inputs/waiting_input/waiting_input.tsx";
import { EditInstrumentAction } from "./edit_instrument_action.ts";

export function LinkedPresets({
    instrument,
    setView,
    setInstruments,
    instruments,
    manager
}: {
    manager: SoundBankManager;
    instrument: BasicInstrument;
    setView: SetViewType;
    setInstruments: (s: BasicInstrument[]) => void;
    instruments: BasicInstrument[];
}) {
    const { t } = useTranslation();
    const linked = useMemo(() => {
        const l = new Set<BasicPreset>();
        instrument.linkedTo.forEach((p) => l.add(p));
        return l;
    }, [instrument]);

    const deleteInstrument = () =>
        manager.modifyBank([
            new DeleteInstrumentAction(instrument, setInstruments, setView)
        ]);

    return (
        <div className={"bottom_bar"}>
            <div>
                <WaitingInput
                    className={"monospaced"}
                    type={"text"}
                    value={instrument.name}
                    setValue={(v) => {
                        const action = new EditInstrumentAction(
                            instruments.indexOf(instrument),
                            "name",
                            instrument.name,
                            v,
                            () => setInstruments([...instruments])
                        );
                        manager.modifyBank([action]);
                        return v;
                    }}
                    maxLength={40}
                />
            </div>

            {instrument.linkedTo.length === 0 && (
                <>
                    <div>
                        <strong>
                            {t("instrumentLocale.notLinkedToPreset")}
                        </strong>
                    </div>
                    <div onClick={deleteInstrument}>
                        <strong className={"warning"}>
                            {t("instrumentLocale.deleteInstrument")}
                        </strong>
                    </div>
                </>
            )}
            {instrument.linkedTo.length > 0 && (
                <>
                    <div>{t("instrumentLocale.usedBy")}:</div>
                    {Array.from(linked).map((preset, i) => (
                        <div
                            className={"monospaced"}
                            onClick={() => setView(preset)}
                            key={i}
                        >
                            {preset.name}
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}
