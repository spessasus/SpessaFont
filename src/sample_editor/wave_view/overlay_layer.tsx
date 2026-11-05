import { useRef } from "react";
import type { SamplePlayerState } from "../use_sample_player.ts";
import { useAudioEngine } from "../../core_backend/audio_engine_context.ts";
import { getCanvasColor, useCanvas } from "../../hooks/use_canvas.ts";
import { useSettings } from "../../settings/settings_context.ts";
import { drawOverlay, type OverlayColors } from "./wave_drawing.ts";
import {
    getPlayheadSample,
    sampleToX,
    type WaveViewport
} from "./wave_geometry.ts";

interface OverlayLayerProps {
    data: Float32Array;
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
    data,
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
    const {
        settings: { theme }
    } = useSettings();
    // Read once per theme, not in every frame of the play head
    const colorsRef = useRef<{ theme: string; colors: OverlayColors }>(null);
    const isPlaying = playerState !== "stopped";
    const sampleCount = data.length;
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
                    sampleRate,
                    sampleCount
                });
                const x = sampleToX(view, playheadSample);
                if (x < 0 || x > size.width) {
                    onPlayheadHidden(x + scrollX);
                }
            }
            if (colorsRef.current?.theme !== theme) {
                colorsRef.current = {
                    theme,
                    colors: {
                        loopStart: getCanvasColor(ctx, "--loop-start-color"),
                        loopEnd: getCanvasColor(ctx, "--loop-end-color"),
                        cursor: getCanvasColor(ctx, "--font-color")
                    }
                };
            }
            drawOverlay(
                ctx,
                size,
                view,
                data,
                { loopStart, loopEnd, hoveredSample, playheadSample },
                colorsRef.current.colors
            );
        },
        { isAnimated: isPlaying }
    );
    return <canvas ref={canvasRef} aria-hidden={true} />;
}
