import "./instrument_display.css";
import type { MouseEvent } from "react";
import type { BasicInstrument } from "spessasynth_core";
import { SampleDisplay } from "../sample_display/sample_display.tsx";
import type { BankEditView } from "../../core_backend/bank_view.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { useEntityRevision } from "../../hooks/use_entity_revision.ts";
import { useTranslation } from "react-i18next";
import { LinkIcon } from "../../utils/icons/edit_icons.tsx";
import { getObjectId } from "../../utils/object_id.ts";
import { ExpandButton } from "../expand_button.tsx";

interface InstrumentDisplayProps {
    instrument: BasicInstrument;
    view: BankEditView;
    isSelected: boolean;
    isOpen: boolean;
    onToggle: () => void;
    onClick: (event: MouseEvent) => void;
    /**
     * Shows the "link selected samples" button when set.
     */
    onLink?: () => void;
}

export function InstrumentDisplay({
    instrument,
    view,
    isSelected,
    isOpen,
    onToggle,
    onClick,
    onLink
}: InstrumentDisplayProps) {
    const { t } = useTranslation();
    const { session, setView } = useBankEditor();
    // Re-render when the instrument's zones or sample names change
    useEntityRevision(session.store, instrument);
    return (
        <div className={"instrument_item_wrapper"}>
            <div
                className={`instrument_item ${isSelected ? "selected" : ""}`}
                title={instrument.name}
            >
                <div className={"left_buttons"}>
                    <ExpandButton isOpen={isOpen} onToggle={onToggle} />
                    {onLink ? (
                        <button
                            type={"button"}
                            className={"plain_button"}
                            title={t("instrumentLocale.linkSelectedSamples")}
                            aria-label={t(
                                "instrumentLocale.linkSelectedSamples"
                            )}
                            onClick={onLink}
                        >
                            <LinkIcon />
                        </button>
                    ) : null}
                </div>
                <button
                    type={"button"}
                    className={"plain_button monospaced instrument_item_name"}
                    onClick={onClick}
                >
                    {instrument.name}
                </button>
            </div>
            {isOpen ? (
                <div className={"instrument_samples"}>
                    {instrument.zones.map((zone) => (
                        <SampleDisplay
                            key={getObjectId(zone)}
                            isSelected={view === zone.sample}
                            sample={zone.sample}
                            onClick={() => setView(zone.sample)}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}
