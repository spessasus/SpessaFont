import type * as React from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SamplePlayerState } from "../use_sample_player.ts";
import "./wave_view.css";
import "./wave_view_phone.css";
import { useLayout } from "../../layout/layout_context.ts";
import { getWaveClickHandlers } from "./wave_click_handlers.ts";
import { xToSample } from "./wave_geometry.ts";
import { WaveformLayer } from "./waveform_layer.tsx";
import { OverlayLayer } from "./overlay_layer.tsx";

/**
 * Shown until the audio is read.
 */
const NO_AUDIO = new Float32Array(0);

interface WaveViewProps {
    /**
     * Undefined until the audio is read, the loop points cannot be set before.
     */
    data: Float32Array | undefined;
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
 * loop end, as a mouse shortcut for the loop inputs. Zooming keeps the middle of the view.
 */
export function WaveView({
    data: readData,
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
    const layout = useLayout();
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [scrollX, setScrollX] = useState(0);
    const [hoveredSample, setHoveredSample] = useState<number | null>(null);
    const isLoaded = readData !== undefined;
    const data = readData ?? NO_AUDIO;
    const sampleCount = data.length;

    // The scroll position is in pixels of the zoomed wave, so a new zoom moves it to keep the
    // sample in the middle of the view where it was. The position before the zoom is kept here,
    // as the scroller has already clamped its own to the new width, and the scroll event that
    // updates the state may not have come yet when the slider moves again
    const zoomRef = useRef(zoom);
    const scrollRef = useRef(0);
    useLayoutEffect(() => {
        const scroller = scrollerRef.current;
        if (!scroller || zoomRef.current === zoom) {
            return;
        }
        const width = scroller.clientWidth;
        const center = (scrollRef.current + width / 2) / zoomRef.current;
        zoomRef.current = zoom;
        scroller.scrollLeft = Math.max(0, center * zoom - width / 2);
        scrollRef.current = scroller.scrollLeft;
    }, [zoom]);

    // The canvases span the whole view (their border is an outline), so the pointer maps
    // through the same width they draw with
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
            data-loading={!isLoaded}
            {...getWaveClickHandlers(layout, {
                isLoaded,
                getSampleAt,
                onLoopStartChange,
                onLoopEndChange
            })}
            onPointerMove={(e) => {
                if (isLoaded) {
                    setHoveredSample(getSampleAt(e));
                }
            }}
            onPointerLeave={() => setHoveredSample(null)}
        >
            <div className={"wave_view_child"}>
                <WaveformLayer data={data} zoom={zoom} scrollX={scrollX} />
                <OverlayLayer
                    data={data}
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
                    {isLoaded ? (
                        <>
                            <span>
                                {t("sampleLocale.lengthFrames", {
                                    frames: sampleCount
                                })}
                            </span>
                            <span>
                                {t("sampleLocale.loopFrames", {
                                    frames: loopEnd - loopStart
                                })}
                            </span>
                            <span>
                                {t("sampleLocale.seconds", {
                                    seconds:
                                        Math.floor(
                                            (sampleCount / sampleRate) * 1000
                                        ) / 1000
                                })}
                            </span>
                        </>
                    ) : (
                        <span>{t("sampleLocale.tools.loading")}</span>
                    )}
                </div>
                {hoveredSample === null ? null : (
                    <div
                        className={"wave_view_text wave_view_hover monospaced"}
                    >
                        <span>{hoveredSample}</span>
                        <span>
                            {t("sampleLocale.milliseconds", {
                                milliseconds: Math.round(
                                    (hoveredSample / sampleRate) * 1000
                                )
                            })}
                        </span>
                    </div>
                )}
            </div>
            <div
                ref={scrollerRef}
                className={"wave_view_child"}
                onScroll={(e) => {
                    scrollRef.current = e.currentTarget.scrollLeft;
                    setScrollX(e.currentTarget.scrollLeft);
                }}
            >
                <div
                    className={"wave_view_scroll"}
                    style={{ "--wave-zoom": zoom }}
                />
            </div>
        </div>
    );
}
