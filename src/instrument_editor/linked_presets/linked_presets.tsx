import type { BasicInstrument } from "spessasynth_core";
import "../../bank_editor/bottom_bar.css";
import { useTranslation } from "react-i18next";
import { DeleteInstrumentAction } from "./delete_instrument_action.ts";
import { WaitingInput } from "../../fancy_inputs/waiting_input/waiting_input.tsx";
import { EditInstrumentNameAction } from "./edit_instrument_name_action.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { getObjectId } from "../../utils/object_id.ts";

const MAX_NAME_LENGTH = 40;

interface LinkedPresetsProps {
    instrument: BasicInstrument;
}

export function LinkedPresets({ instrument }: LinkedPresetsProps) {
    const { t } = useTranslation();
    const { apply, setView } = useBankEditor();
    // A preset with several zones of this instrument is listed once
    const linked = new Set(instrument.linkedTo);

    return (
        <div className={"bottom_bar"}>
            <div>
                <WaitingInput
                    className={"monospaced"}
                    type={"text"}
                    value={instrument.name}
                    aria-label={t("instrumentLocale.instrumentName")}
                    setValue={(name) => {
                        apply([
                            new EditInstrumentNameAction(
                                instrument,
                                instrument.name,
                                name
                            )
                        ]);
                        return name;
                    }}
                    maxLength={MAX_NAME_LENGTH}
                />
            </div>

            {linked.size === 0 ? (
                <>
                    <div>
                        <strong>
                            {t("instrumentLocale.notLinkedToPreset")}
                        </strong>
                    </div>
                    <button
                        type={"button"}
                        className={"plain_button"}
                        onClick={() =>
                            apply([new DeleteInstrumentAction(instrument)])
                        }
                    >
                        <strong className={"warning"}>
                            {t("instrumentLocale.deleteInstrument")}
                        </strong>
                    </button>
                </>
            ) : (
                <>
                    <div>{t("instrumentLocale.usedBy")}:</div>
                    {Array.from(linked, (preset) => (
                        <button
                            type={"button"}
                            className={"plain_button monospaced"}
                            onClick={() => setView(preset)}
                            key={getObjectId(preset)}
                        >
                            {preset.name}
                        </button>
                    ))}
                </>
            )}
        </div>
    );
}
