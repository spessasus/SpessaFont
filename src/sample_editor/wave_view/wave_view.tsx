import type * as React from "react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SamplePlayerState } from "../use_sample_player.ts";
import "./wave_view.css";
import { xToSample } from "./wave_geometry.ts";
import { WaveformLayer } from "./waveform_layer.tsx";
import { OverlayLayer } from "./overlay_layer.tsx";

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
                            // Just inside the view, past it would hide it again
                            scrollerRef.current.scrollLeft = Math.max(0, x - 1);
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
