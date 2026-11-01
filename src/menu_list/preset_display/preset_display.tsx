import "./preset_display.css";
import type { MouseEvent } from "react";
import type { BasicInstrument, BasicPreset } from "spessasynth_core";
import { InstrumentDisplay } from "../instrument_display/instrument_display.tsx";
import { ExpandButton } from "../expand_button.tsx";
import type { BankEditView } from "../../core_backend/bank_view.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { useEntityRevision } from "../../hooks/use_entity_revision.ts";
import { useTranslation } from "react-i18next";
import { LinkIcon } from "../../utils/icons.tsx";
import { getObjectId } from "../../utils/object_id.ts";

function PatchNumber({ n }: { n: number }) {
    return (
        <span className={`monospaced ${n === 0 ? "patch_number_zero" : ""}`}>
            {n.toString().padStart(3, "0")}
        </span>
    );
}

interface PresetDisplayProps {
    preset: BasicPreset;
    view: BankEditView;
    isSelected: boolean;
    isOpen: boolean;
    onToggle: () => void;
    /**
     * Whether each listed instrument of this preset is expanded.
     */
    isInstrumentOpen: (instrument: BasicInstrument) => boolean;
    onToggleInstrument: (instrument: BasicInstrument) => void;
    onClick: (event: MouseEvent) => void;
    /**
     * Shows the "link selected instruments" button when set.
     */
    onLink?: () => void;
}

export function PresetDisplay({
    preset,
    view,
    isSelected,
    isOpen,
    onToggle,
    isInstrumentOpen,
    onToggleInstrument,
    onClick,
    onLink
}: PresetDisplayProps) {
    const { t } = useTranslation();
    const { session, setView } = useBankEditor();
    // Re-render when the preset's zones or instrument names change
    useEntityRevision(session.store, preset);
    return (
        <div className={"preset_item_wrapper"}>
            <div
                className={`preset_item ${isSelected ? "selected" : ""}`}
                title={preset.name}
            >
                <div className={"left_group"}>
                    <ExpandButton isOpen={isOpen} onToggle={onToggle} />
                    <span className={"monospaced midi_patch"}>
                        {preset.isGMGSDrum ? (
                            `DRUMS:${preset.program}`
                        ) : (
                            <>
                                <PatchNumber n={preset.bankLSB} />:
                                <PatchNumber n={preset.bankMSB} />:
                                <PatchNumber n={preset.program} />
                            </>
                        )}
                    </span>
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
                    onClick={onClick}
                >
                    {preset.name}
                </button>
            </div>
            {isOpen ? (
                <div className={"preset_instruments"}>
                    {preset.zones.map((zone) => (
                        <InstrumentDisplay
                            key={getObjectId(zone)}
                            instrument={zone.instrument}
                            view={view}
                            isSelected={view === zone.instrument}
                            isOpen={isInstrumentOpen(zone.instrument)}
                            onToggle={() => onToggleInstrument(zone.instrument)}
                            onClick={() => setView(zone.instrument)}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}
