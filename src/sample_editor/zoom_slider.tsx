import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ControllerRange } from "../fancy_inputs/controller_range/controller_range.tsx";
import { getMaxZoom, getSliderValue, getSliderZoom } from "./zoom_mapping.ts";

interface ZoomSliderProps {
    /**
     * Longer samples can zoom in further.
     */
    sampleLength: number;
    zoom: number;
    onZoomChange: (zoom: number) => void;
}

/**
 * The wave's zoom. A zoom made elsewhere (a pinch) moves it, while its own moves keep the
 * dragged position: near 100 a step zooms by less than a double holds, and the position read
 * back from that zoom would snap back to 100.
 */
export function ZoomSlider({
    sampleLength,
    zoom,
    onZoomChange
}: ZoomSliderProps) {
    const { t } = useTranslation();
    const maxZoom = getMaxZoom(sampleLength);
    // The last position the slider set, with the zoom it set
    const [dragged, setDragged] = useState({ value: 100, zoom: 1 });
    const value =
        dragged.zoom === zoom ? dragged.value : getSliderValue(zoom, maxZoom);
    return (
        <ControllerRange
            max={(maxZoom - 1) * 100}
            min={100}
            onChange={(next) => {
                const nextZoom = getSliderZoom(next, maxZoom);
                setDragged({ value: next, zoom: nextZoom });
                onZoomChange(nextZoom);
            }}
            value={value}
            text={t("sampleLocale.waveZoomPercent", {
                percent: Math.floor(zoom * 10_000) / 100
            })}
        />
    );
}
