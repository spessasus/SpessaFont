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
import { type LoopPreview, WaveTouchLayer } from "./wave_touch_layer.tsx";
import { getPinchScroll } from "./wave_pinch.ts";
import { useWaveGestures } from "./use_wave_gestures.ts";

/**
 * Shown until the audio is read.
 */
const NO_AUDIO = new Float32Array(0);

interface WaveViewProps {
    /**
     * The shown sample's view id. A drag on the phone's loop handles belongs to one sample.
     */
    sampleId: number;
    /**
     * Undefined until the audio is read, the loop points cannot be set before.
     */
    data: Float32Array | undefined;
    loopStart: number;
    loopEnd: number;
    onLoopStartChange: (loopStart: number) => void;
    onLoopEndChange: (loopEnd: number) => void;
    /**
     * Steps of the phone's loop handles from the keyboard. A burst is one undo step.
     */
    onStepLoopStart: (by: number) => void;
    onStepLoopEnd: (by: number) => void;
    sampleRate: number;
    playbackStartTime: number;
    playerState: SamplePlayerState;
    zoom: number;
    /**
     * The largest zoom a pinch may reach, the zoom slider's.
     */
    maxZoom: number;
    onZoomChange: (zoom: number) => void;
    centCorrection: number;
}

/**
 * The sample's wave with its loop points. A click sets the loop start and a right click the
 * loop end, as a mouse shortcut for the loop inputs. On a phone the loop lines have handles to
 * drag instead (`WaveTouchLayer`), one finger scrolls and two fingers zoom. The slider's zoom
 * keeps the middle of the view, a pinch keeps the sample between the fingers.
 */
export function WaveView({
    sampleId,
    data: readData,
    loopStart,
    loopEnd,
    onLoopStartChange,
    onLoopEndChange,
    onStepLoopStart,
    onStepLoopEnd,
    sampleRate,
    playbackStartTime,
    playerState,
    zoom,
    maxZoom,
    onZoomChange,
    centCorrection
}: WaveViewProps) {
    const { t } = useTranslation();
    const layout = useLayout();
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [scrollX, setScrollX] = useState(0);
    const [hoveredSample, setHoveredSample] = useState<number | null>(null);
    // A loop handle drag, kept with its sample so another sample never shows it
    const [dragPreview, setDragPreview] = useState<
        (LoopPreview & { sampleId: number }) | null
    >(null);
    const [width, setWidth] = useState(0);
    const isLoaded = readData !== undefined;
    const data = readData ?? NO_AUDIO;
    const sampleCount = data.length;
    const preview = dragPreview?.sampleId === sampleId ? dragPreview : null;
    const shownStart =
        preview?.property === "loopStart" ? preview.point : loopStart;
    const shownEnd = preview?.property === "loopEnd" ? preview.point : loopEnd;
    const hasHandles = layout === "phone" && isLoaded && width > 0;

    // The handles are placed in pixels, so the phone follows the view's width
    const measureWidth = (node: HTMLDivElement | null) => {
        if (!node || layout !== "phone") {
            return;
        }
        if (typeof ResizeObserver === "undefined") {
            setWidth(node.clientWidth);
            return;
        }
        const observer = new ResizeObserver(([entry]) =>
            setWidth(entry.contentRect.width)
        );
        observer.observe(node);
        return () => observer.disconnect();
    };

    // The scroll position is in pixels of the zoomed wave, so a new zoom moves it to keep the
    // sample in the middle of the view (or under a pinch) where it was. The position before the
    // zoom is kept here, as the scroller has already clamped its own to the new width, and the
    // scroll event that updates the state may not have come yet when the slider moves again
    const zoomRef = useRef(zoom);
    const scrollRef = useRef(0);
    const zoomAnchorRef = useRef<number | null>(null);
    useLayoutEffect(() => {
        const scroller = scrollerRef.current;
        if (!scroller || zoomRef.current === zoom) {
            return;
        }
        const centerX = zoomAnchorRef.current ?? scroller.clientWidth / 2;
        zoomAnchorRef.current = null;
        scroller.scrollLeft = getPinchScroll({
            centerX,
            scrollX: scrollRef.current,
            oldZoom: zoomRef.current,
            newZoom: zoom
        });
        zoomRef.current = zoom;
        scrollRef.current = scroller.scrollLeft;
    }, [zoom]);
    const gestures = useWaveGestures({
        layout,
        scrollerRef,
        zoomAnchorRef,
        zoom,
        maxZoom,
        onZoomChange,
        isHandleDragging: preview !== null
    });

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
            ref={measureWidth}
            className={"wave_view"}
            data-loading={!isLoaded}
            {...getWaveClickHandlers(layout, {
                isLoaded,
                getSampleAt,
                onLoopStartChange,
                onLoopEndChange
            })}
            onPointerDown={gestures.onPointerDown}
            onPointerUp={gestures.onPointerUp}
            onPointerCancel={gestures.onPointerCancel}
            onPointerMove={(e) => {
                gestures.onPointerMove?.(e);
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
                    loopStart={shownStart}
                    loopEnd={shownEnd}
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
                                    frames: shownEnd - shownStart
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
            {hasHandles ? (
                <WaveTouchLayer
                    key={sampleId}
                    viewport={{ sampleCount, width, zoom, scrollX }}
                    loopStart={shownStart}
                    loopEnd={shownEnd}
                    sampleLength={sampleCount}
                    sampleRate={sampleRate}
                    onPreviewChange={(next) =>
                        setDragPreview(next && { ...next, sampleId })
                    }
                    onLoopStartChange={onLoopStartChange}
                    onLoopEndChange={onLoopEndChange}
                    onStepLoopStart={onStepLoopStart}
                    onStepLoopEnd={onStepLoopEnd}
                />
            ) : null}
        </div>
    );
}
