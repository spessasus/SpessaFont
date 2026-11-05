import "./preset_display.css";
import type { MouseEvent, PointerEvent } from "react";
import type { BasicInstrument, BasicPreset } from "spessasynth_core";
import { InstrumentDisplay } from "../instrument_display/instrument_display.tsx";
import { useLinkDropTarget } from "../../drag_and_drop/use_link_drop_target.ts";
import { ExpandButton } from "../expand_button.tsx";
import type { BankEditView, BankEntity } from "../../core_backend/bank_view.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { usePresetView } from "../../hooks/use_preset_view.ts";
import { useEntityLookup } from "../../hooks/use_entity_lookup.ts";
import { useTranslation } from "react-i18next";
import { LinkIcon } from "../../utils/icons/edit_icons.tsx";
import { getObjectId } from "../../utils/object_id.ts";

interface PatchNumberProps {
    n: number;
}

function PatchNumber({ n }: PatchNumberProps) {
    return (
        <span className={`monospaced ${n === 0 ? "patch_number_zero" : ""}`}>
            {n.toString().padStart(3, "0")}
        </span>
    );
}

interface PresetDisplayProps {
    /**
     * The preset's identity, for the drop target and the handlers. What is shown comes from
     * its view.
     */
    preset: BasicPreset;
    view: BankEditView;
    isSelected: boolean;
    /**
     * Whether the preset is the shown element.
     */
    isShown: boolean;
    isOpen: boolean;
    onToggle: () => void;
    /**
     * Whether each listed instrument of this preset is expanded.
     */
    isInstrumentOpen: (instrumentId: number) => boolean;
    onToggleInstrument: (instrumentId: number) => void;
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
     * Opens the menu of a listed instrument of this preset, or of one of its samples.
     */
    onChildContextMenu: (entity: BankEntity, event: MouseEvent) => void;
    /**
     * Shows the "link selected instruments" button when set.
     */
    onLink?: () => void;
}

export function PresetDisplay({
    preset,
    view,
    isSelected,
    isShown,
    isOpen,
    onToggle,
    isInstrumentOpen,
    onToggleInstrument,
    onClick,
    onContextMenu,
    onPointerDown,
    onChildContextMenu,
    onLink
}: PresetDisplayProps) {
    const { t } = useTranslation();
    const { session, setView } = useBankEditor();
    const presetView = usePresetView(session.store, getObjectId(preset));
    const lookup = useEntityLookup(session.store);
    const dropTarget = useLinkDropTarget(preset);
    // The row can render once more after its preset was removed, before the list updates
    if (!presetView) {
        return null;
    }
    const viewId = view === "info" ? undefined : getObjectId(view);
    const showInstrument = (id: number) => {
        const instrument: BasicInstrument | undefined = lookup.instrument(id);
        if (instrument) {
            setView(instrument);
        }
    };
    return (
        <div className={"preset_item_wrapper"}>
            <div
                className={`preset_item ${isSelected ? "selected" : ""}`}
                onContextMenu={onContextMenu}
                onPointerDown={onPointerDown}
                {...dropTarget}
                title={presetView.name}
            >
                <div className={"preset_item_left"}>
                    {/* Clicking the patch expands the preset too */}
                    <ExpandButton isOpen={isOpen} onToggle={onToggle}>
                        <span className={"monospaced preset_item_patch"}>
                            {presetView.isGMGSDrum
                                ? t("presetList.drumsPrefix")
                                : null}
                            {/* A drum kit shows its bank numbers only when it sets them */}
                            {presetView.isGMGSDrum &&
                            presetView.bankLSB === 0 &&
                            presetView.bankMSB === 0 ? null : (
                                <>
                                    <PatchNumber n={presetView.bankLSB} />:
                                    <PatchNumber n={presetView.bankMSB} />:
                                </>
                            )}
                            <PatchNumber n={presetView.program} />
                        </span>
                    </ExpandButton>
                    {onLink ? (
                        <button
                            type={"button"}
                            className={"plain_button"}
                            title={t("presetLocale.linkSelectedInstruments")}
                            aria-label={t(
                                "presetLocale.linkSelectedInstruments"
                            )}
                            onClick={onLink}
                        >
                            <LinkIcon />
                        </button>
                    ) : null}
                </div>
                <button
                    type={"button"}
                    className={"plain_button monospaced preset_item_name"}
                    data-list-row={true}
                    aria-current={isShown}
                    aria-description={
                        isSelected && !isShown
                            ? t("presetList.selected")
                            : undefined
                    }
                    onClick={onClick}
                >
                    {presetView.name}
                </button>
            </div>
            {isOpen ? (
                <div className={"preset_instruments"}>
                    {presetView.zones.map((zone) =>
                        zone.childId === undefined ? null : (
                            <InstrumentDisplay
                                key={zone.id}
                                instrumentId={zone.childId}
                                view={view}
                                isSelected={viewId === zone.childId}
                                isShown={viewId === zone.childId}
                                isOpen={isInstrumentOpen(zone.childId)}
                                onToggle={() =>
                                    onToggleInstrument(zone.childId ?? -1)
                                }
                                onClick={() =>
                                    showInstrument(zone.childId ?? -1)
                                }
                                onContextMenu={(e) => {
                                    const instrument = lookup.instrument(
                                        zone.childId ?? -1
                                    );
                                    if (instrument) {
                                        onChildContextMenu(instrument, e);
                                    }
                                }}
                                onChildContextMenu={onChildContextMenu}
                            />
                        )
                    )}
                </div>
            ) : null}
        </div>
    );
}
