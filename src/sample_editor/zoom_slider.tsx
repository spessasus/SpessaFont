import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ControllerRange } from "../fancy_inputs/controller_range/controller_range.tsx";

const ZOOM_PER_SAMPLE = 50_000 / 6_000_000;
const MIN_MAX_ZOOM = 5;
/**
 * The zoom slider maps to the zoom exponentially, so small zooms get most of its range.
 */
const ZOOM_CURVE = 5;

interface ZoomSliderProps {
    /**
     * Longer samples can zoom in further.
     */
    sampleLength: number;
    zoom: number;
    onZoomChange: (zoom: number) => void;
}

export function ZoomSlider({
    sampleLength,
    zoom,
    onZoomChange
}: ZoomSliderProps) {
    const { t } = useTranslation();
    const [sliderValue, setSliderValue] = useState(100);
    const maxZoom = Math.max(MIN_MAX_ZOOM, ZOOM_PER_SAMPLE * sampleLength + 1);
    return (
        <ControllerRange
            max={(maxZoom - 1) * 100}
            min={100}
            onChange={(value) => {
                const mapped = (value / 100 - 1) / (maxZoom - 1);
                onZoomChange(Math.pow(mapped, ZOOM_CURVE) * (maxZoom - 1) + 1);
                setSliderValue(value);
            }}
            value={sliderValue}
            text={`${t("sampleLocale.waveZoom")}: ${
                Math.floor(zoom * 10_000) / 100
            }%`}
        />
    );
}
