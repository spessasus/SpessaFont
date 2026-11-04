import "./instrument_display.css";
import type { MouseEvent, PointerEvent } from "react";
import type { BankEditView } from "../../core_backend/bank_view.ts";
import { SampleDisplay } from "../sample_display/sample_display.tsx";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { useInstrumentView } from "../../hooks/use_instrument_view.ts";
import { useEntityLookup } from "../../hooks/use_entity_lookup.ts";
import { useTranslation } from "react-i18next";
import { LinkIcon } from "../../utils/icons/edit_icons.tsx";
import { getObjectId } from "../../utils/object_id.ts";
import { useLinkDropTarget } from "../../drag_and_drop/use_link_drop_target.ts";
import { ExpandButton } from "../expand_button.tsx";

interface InstrumentDisplayProps {
    /**
     * The instrument's view id.
     */
    instrumentId: number;
    view: BankEditView;
    isSelected: boolean;
    isOpen: boolean;
    onToggle: () => void;
    onClick: (event: MouseEvent) => void;
    /**
     * Opens the menu on the whole row. The name button inside it gets the menu key.
     */
    onContextMenu?: (event: MouseEvent) => void;
    /**
     * Starts dragging the row.
     */
    onPointerDown?: (event: PointerEvent) => void;
    /**
     * Shows the "link selected samples" button when set.
     */
    onLink?: () => void;
}

export function InstrumentDisplay({
    instrumentId,
    view,
    isSelected,
    isOpen,
    onToggle,
    onClick,
    onContextMenu,
    onPointerDown,
    onLink
}: InstrumentDisplayProps) {
    const { t } = useTranslation();
    const { session, setView } = useBankEditor();
    const instrument = useInstrumentView(session.store, instrumentId);
    const lookup = useEntityLookup(session.store);
    const dropTarget = useLinkDropTarget(lookup.instrument(instrumentId));
    // The row can render once more after its instrument was removed, before the list updates
    if (!instrument) {
        return null;
    }
    const viewId = view === "info" ? undefined : getObjectId(view);
    const showSample = (id: number) => {
        const sample = lookup.sample(id);
        if (sample) {
            setView(sample);
        }
    };
    return (
        <div className={"instrument_item_wrapper"}>
            <div
                className={`instrument_item ${isSelected ? "selected" : ""}`}
                onContextMenu={onContextMenu}
                onPointerDown={onPointerDown}
                {...dropTarget}
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
                    {instrument.zones.map((zone) =>
                        zone.childId === undefined ? null : (
                            <SampleDisplay
                                key={zone.id}
                                isSelected={viewId === zone.childId}
                                sampleId={zone.childId}
                                onClick={() => showSample(zone.childId ?? -1)}
                            />
                        )
                    )}
                </div>
            ) : null}
        </div>
    );
}
