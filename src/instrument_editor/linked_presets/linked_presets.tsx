import type { BasicInstrument } from "spessasynth_core";
import "../../bank_editor/bottom_bar.css";
import { useTranslation } from "react-i18next";

import { DeleteInstrumentAction } from "./delete_instrument_action.ts";
import { WaitingInput } from "../../fancy_inputs/waiting_input/waiting_input.tsx";
import { EditInstrumentNameAction } from "./edit_instrument_name_action.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { getObjectId } from "../../utils/object_id.ts";

export function LinkedPresets({ instrument }: { instrument: BasicInstrument }) {
    const { t } = useTranslation();
    const { apply, setView } = useBankEditor();
    // A preset with several zones of this instrument is listed once
    const linked = new Set(instrument.linkedTo);

    const deleteInstrument = () =>
        apply([new DeleteInstrumentAction(instrument)]);

    return (
        <div className={"bottom_bar"}>
            <div>
                <WaitingInput
                    className={"monospaced"}
                    type={"text"}
                    value={instrument.name}
                    setValue={(v) => {
                        apply([
                            new EditInstrumentNameAction(
                                instrument,
                                instrument.name,
                                v
                            )
                        ]);
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
                    {Array.from(linked, (preset) => (
                        <div
                            className={"monospaced"}
                            onClick={() => setView(preset)}
                            key={getObjectId(preset)}
                        >
                            {preset.name}
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}
