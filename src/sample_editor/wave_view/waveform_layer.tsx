import { getCanvasColor, useCanvas } from "../../hooks/use_canvas.ts";
import { drawWaveform } from "./wave_drawing.ts";

interface WaveformLayerProps {
    data: Float32Array;
    loopStart: number;
    loopEnd: number;
    zoom: number;
    scrollX: number;
}

/**
 * Its own layer because drawing a long sample is slow, and the view re-renders on every pointer
 * move to show the hovered sample. The compiler skips it while its props stay the same.
 */
export function WaveformLayer({
    data,
    loopStart,
    loopEnd,
    zoom,
    scrollX
}: WaveformLayerProps) {
    const canvasRef = useCanvas((ctx, size) =>
        drawWaveform(
            ctx,
            size,
            { sampleCount: data.length, width: size.width, zoom, scrollX },
            data,
            { loopStart, loopEnd },
            {
                grid: getCanvasColor(ctx, "--lighter-color-end"),
                wave: getCanvasColor(ctx, "--wave-color"),
                loopStart: getCanvasColor(ctx, "--loop-start-color"),
                loopEnd: getCanvasColor(ctx, "--loop-end-color")
            }
        )
    );
    return <canvas ref={canvasRef} aria-hidden={true} />;
}
