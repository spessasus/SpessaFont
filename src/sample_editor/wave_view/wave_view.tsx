import type * as React from "react";
import { memo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SamplePlayerState } from "../use_sample_player.ts";
import "./wave_view.css";
import { useAudioEngine } from "../../core_backend/audio_engine_context.ts";
import { getCanvasColor, useCanvas } from "../../hooks/use_canvas.ts";
import { drawOverlay, drawWaveform } from "./wave_drawing.ts";
import {
    getPlayheadSample,
    sampleToX,
    type WaveViewport,
    xToSample
} from "./wave_geometry.ts";

interface WaveformLayerProps {
    data: Float32Array;
    loopStart: number;
    loopEnd: number;
    zoom: number;
    scrollX: number;
}

/**
 * Memoized because drawing a long sample is slow, and the view re-renders on every pointer
 * move to show the hovered sample.
 */
const WaveformLayer = memo(function WaveformLayer({
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
                wave: getCanvasColor(ctx, "--primary-color"),
                loopStart: getCanvasColor(ctx, "--loop-start-color"),
                loopEnd: getCanvasColor(ctx, "--loop-end-color")
            }
        )
    );
    return <canvas ref={canvasRef} aria-hidden={true} />;
});

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

function OverlayLayer({
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

interface WaveViewProps {
    data: Float32Array;
    loopStart: number;
    loopEnd: number;
    onLoopStartChange: (loopStart: number) => void;
    onLoopEndChange: (loopEnd: number) => void;
    sampleRate: number;
    playbackStartTime: number;
    playerState: SamplePlayerState;
    zoom: number;
    centCorrection: number;
}

/**
 * The sample's wave with its loop points. A click sets the loop start and a right click the
 * loop end, as a mouse shortcut for the loop inputs.
 */
export function WaveView({
    data,
    loopStart,
    loopEnd,
    onLoopStartChange,
    onLoopEndChange,
    sampleRate,
    playbackStartTime,
    playerState,
    zoom,
    centCorrection
}: WaveViewProps) {
    const { t } = useTranslation();
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [scrollX, setScrollX] = useState(0);
    const [hoveredSample, setHoveredSample] = useState<number | null>(null);
    const sampleCount = data.length;

    const getSampleAt = (e: React.MouseEvent<HTMLElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        return xToSample(
            { sampleCount, width: rect.width, zoom, scrollX },
            e.clientX - rect.left
        );
    };

    return (
        <div
            className={"wave_view"}
            onClick={(e) => onLoopStartChange(getSampleAt(e))}
            onContextMenu={(e) => {
                e.preventDefault();
                onLoopEndChange(getSampleAt(e));
            }}
            onPointerMove={(e) => setHoveredSample(getSampleAt(e))}
            onPointerLeave={() => setHoveredSample(null)}
        >
            <div className={"wave_view_child"}>
                <WaveformLayer
                    data={data}
                    loopStart={loopStart}
                    loopEnd={loopEnd}
                    zoom={zoom}
                    scrollX={scrollX}
                />
                <OverlayLayer
                    sampleCount={sampleCount}
                    loopStart={loopStart}
                    loopEnd={loopEnd}
                    zoom={zoom}
                    scrollX={scrollX}
                    hoveredSample={hoveredSample}
                    sampleRate={sampleRate}
                    playerState={playerState}
                    playbackStartTime={playbackStartTime}
                    playbackRate={Math.pow(2, centCorrection / 1200)}
                    onPlayheadHidden={(x) => {
                        if (scrollerRef.current) {
                            scrollerRef.current.scrollLeft = x + 1;
                        }
                    }}
                />
                <div className={"wave_view_text monospaced"}>
                    <span>
                        {t("sampleLocale.length")}: {sampleCount}
                    </span>
                    <span>
                        {t("sampleLocale.loop")}: {loopEnd - loopStart}
                    </span>
                    <span>
                        {Math.floor((sampleCount / sampleRate) * 1000) / 1000}s
                    </span>
                </div>
                {hoveredSample === null ? null : (
                    <div
                        className={"wave_view_text wave_view_hover monospaced"}
                    >
                        <span>{hoveredSample}</span>
                        <span>
                            {Math.round((hoveredSample / sampleRate) * 1000)}ms
                        </span>
                    </div>
                )}
            </div>
            <div
                ref={scrollerRef}
                className={"wave_view_child"}
                onScroll={(e) => setScrollX(e.currentTarget.scrollLeft)}
            >
                <div
                    className={"fake_scroll"}
                    style={{ "--wave-zoom": zoom }}
                />
            </div>
        </div>
    );
}
