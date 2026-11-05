import { useMemo } from "react";
import { getCanvasColor, useCanvas } from "../../hooks/use_canvas.ts";
import { drawWaveform } from "./wave_drawing.ts";
import { buildPeaks } from "./wave_peaks.ts";

interface WaveformLayerProps {
    data: Float32Array;
    zoom: number;
    scrollX: number;
}

/**
 * Its own layer because drawing a long sample is slow, and the view re-renders on every pointer
 * move to show the hovered sample. The compiler skips it while its props stay the same, and loop
 * edits draw on the overlay, so they do not redraw it either.
 */
export function WaveformLayer({ data, zoom, scrollX }: WaveformLayerProps) {
    // A pass over the whole sample, so it must only run when the audio changes, which the
    // compiler's caching does not promise
    const peaks = useMemo(() => buildPeaks(data), [data]);
    const canvasRef = useCanvas((ctx, size) =>
        drawWaveform(
            ctx,
            size,
            { sampleCount: data.length, width: size.width, zoom, scrollX },
            data,
            peaks,
            {
                grid: getCanvasColor(ctx, "--lighter-color-end"),
                wave: getCanvasColor(ctx, "--wave-color")
            }
        )
    );
    return <canvas ref={canvasRef} aria-hidden={true} />;
}
