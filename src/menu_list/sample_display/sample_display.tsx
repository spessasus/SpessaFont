import "./sample_display.css";
import type { MouseEvent, PointerEvent } from "react";
import { SpeakerIcon } from "../../utils/icons/player_icons.tsx";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { useSampleView } from "../../hooks/use_sample_view.ts";

interface SampleDisplayProps {
    /**
     * The sample's view id.
     */
    sampleId: number;
    isSelected: boolean;
    onClick: (event: MouseEvent) => void;
    onDoubleClick?: () => void;
    onContextMenu?: (event: MouseEvent) => void;
    /**
     * Starts dragging the sample.
     */
    onPointerDown?: (event: PointerEvent) => void;
}

export function SampleDisplay({
    sampleId,
    isSelected,
    onClick,
    onDoubleClick,
    onContextMenu,
    onPointerDown
}: SampleDisplayProps) {
    const { session } = useBankEditor();
    const sample = useSampleView(session.store, sampleId);
    // The row can render once more after its sample was removed, before the list updates
    if (!sample) {
        return null;
    }
    return (
        <button
            type={"button"}
            className={`plain_button sample_display ${isSelected ? "selected" : ""}`}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onContextMenu={onContextMenu}
            onPointerDown={onPointerDown}
            title={sample.name}
        >
            <SpeakerIcon />
            <span className={"monospaced"}>{sample.name}</span>
        </button>
    );
}
