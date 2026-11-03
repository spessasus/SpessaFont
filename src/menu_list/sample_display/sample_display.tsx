import "./sample_display.css";
import type { MouseEvent, PointerEvent } from "react";
import type { BasicSample } from "spessasynth_core";
import { SpeakerIcon } from "../../utils/icons/player_icons.tsx";

interface SampleDisplayProps {
    sample: BasicSample;
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
    sample,
    isSelected,
    onClick,
    onDoubleClick,
    onContextMenu,
    onPointerDown
}: SampleDisplayProps) {
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
