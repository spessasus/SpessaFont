import type { SamplePlayerState } from "../use_sample_player.ts";
import { useAudioEngine } from "../../core_backend/audio_engine_context.ts";
import { getCanvasColor, useCanvas } from "../../hooks/use_canvas.ts";
import { drawOverlay } from "./wave_drawing.ts";
import {
    getPlayheadSample,
    sampleToX,
    type WaveViewport
} from "./wave_geometry.ts";

interface OverlayLayerProps {
    sampleCount: number;
    loopStart: number;
    loopEnd: number;
    zoom: number;
    scrollX: number;
    hoveredSample: number | null;
    sampleRate: number;
    playerState: SamplePlayerState;
    playbackStartTime: number;
    playbackRate: number;
    /**
     * Called while the play head is outside the view, with its x in the whole sample.
     */
    onPlayheadHidden: (x: number) => void;
}

export function OverlayLayer({
    sampleCount,
    loopStart,
    loopEnd,
    zoom,
    scrollX,
    hoveredSample,
    sampleRate,
    playerState,
    playbackStartTime,
    playbackRate,
    onPlayheadHidden
}: OverlayLayerProps) {
    const {
        audioEngine: { context }
    } = useAudioEngine();
    const isPlaying = playerState !== "stopped";
    const canvasRef = useCanvas(
        (ctx, size) => {
            const view: WaveViewport = {
                sampleCount,
                width: size.width,
                zoom,
                scrollX
            };
            let playheadSample: number | null = null;
            if (isPlaying) {
                // The time being heard now, which is behind currentTime by the output latency
                const heardTime =
                    context.getOutputTimestamp().contextTime ??
                    context.currentTime;
                playheadSample = getPlayheadSample({
                    elapsed: (heardTime - playbackStartTime) * playbackRate,
                    isLooped: playerState === "playing_loop",
                    loopStart,
                    loopEnd,
                    sampleRate
                });
                const x = sampleToX(view, playheadSample);
                if (x < 0 || x > size.width) {
                    onPlayheadHidden(x + scrollX);
                }
            }
            drawOverlay(
                ctx,
                size,
                view,
                { loopStart, loopEnd, hoveredSample, playheadSample },
                {
                    loopStart: getCanvasColor(ctx, "--loop-start-color"),
                    loopEnd: getCanvasColor(ctx, "--loop-end-color"),
                    cursor: getCanvasColor(ctx, "--font-color")
                }
            );
        },
        { isAnimated: isPlaying }
    );
    return <canvas ref={canvasRef} aria-hidden={true} />;
}
