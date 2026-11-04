import type { BasicInstrument } from "spessasynth_core";
import "../../bank_editor/bottom_bar.css";
import { useTranslation } from "react-i18next";
import { DeleteInstrumentAction } from "./delete_instrument_action.ts";
import { WaitingInput } from "../../fancy_inputs/waiting_input/waiting_input.tsx";
import { EditInstrumentNameAction } from "./edit_instrument_name_action.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { getObjectId } from "../../utils/object_id.ts";
import { useInstrumentView } from "../../hooks/use_instrument_view.ts";
import { useBankSnapshot } from "../../hooks/use_bank_snapshot.ts";
import { useEntityLookup } from "../../hooks/use_entity_lookup.ts";

const MAX_NAME_LENGTH = 40;

interface LinkedPresetsProps {
    /**
     * The edited instrument, for the actions. What the bar shows comes from its view.
     */
    instrument: BasicInstrument;
}

export function LinkedPresets({ instrument }: LinkedPresetsProps) {
    const { t } = useTranslation();
    const { session, apply, setView } = useBankEditor();
    const view = useInstrumentView(session.store, getObjectId(instrument));
    const presets = useBankSnapshot(session.store, (s) => s.views.presets);
    const lookup = useEntityLookup(session.store);
    // The pane closes when its instrument is removed, this only covers the render before
    if (!view) {
        return null;
    }
    // A preset with several zones of this instrument is listed once
    const linked = new Set(view.usedBy);
    const showPreset = (id: number) => {
        const preset = lookup.preset(id);
        if (preset) {
            setView(preset);
        }
    };

    return (
        <div className={"bottom_bar"}>
            <div>
                <WaitingInput
                    className={"monospaced"}
                    type={"text"}
                    value={view.name}
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
                    {Array.from(linked, (id) => (
                        <button
                            type={"button"}
                            className={"plain_button monospaced"}
                            onClick={() => showPreset(id)}
                            key={id}
                        >
                            {presets.get(id)?.name}
                        </button>
                    ))}
                </>
            )}
        </div>
    );
}
