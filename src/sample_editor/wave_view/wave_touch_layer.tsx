import type * as React from "react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./wave_touch_layer_phone.css";
import { fitLoopPoint } from "../loop_points.ts";
import { sampleToX, type WaveViewport, xToSample } from "./wave_geometry.ts";
import {
    getHandleLefts,
    getReadoutLeft,
    HANDLE_SIZE,
    isHandleVisible,
    type LoopHandle
} from "./wave_handle_geometry.ts";

/**
 * A loop point being dragged, which the wave shows instead of the stored one.
 */
export interface LoopPreview {
    property: "loopStart" | "loopEnd";
    point: number;
}

interface WaveTouchLayerProps {
    viewport: WaveViewport;
    /**
     * The loop as shown, with a dragged point already in it.
     */
    loopStart: number;
    loopEnd: number;
    sampleLength: number;
    sampleRate: number;
    /**
     * Called on every move of a drag, and with null when it ends.
     */
    onPreviewChange: (preview: LoopPreview | null) => void;
    onLoopStartChange: (point: number) => void;
    onLoopEndChange: (point: number) => void;
    onStepLoopStart: (by: number) => void;
    onStepLoopEnd: (by: number) => void;
}

/**
 * The phone's loop handles over the wave: a 44 px button at the bottom of each loop line.
 * Dragging one shows the point in the wave and a readout above the finger, and the release
 * makes one history step. A canceled drag, or one whose layer goes away, changes nothing.
 */
export function WaveTouchLayer({
    viewport,
    loopStart,
    loopEnd,
    sampleLength,
    sampleRate,
    onPreviewChange,
    onLoopStartChange,
    onLoopEndChange,
    onStepLoopStart,
    onStepLoopEnd
}: WaveTouchLayerProps) {
    const { t } = useTranslation();
    const layerRef = useRef<HTMLDivElement>(null);
    // The sample under the finger, before the fit, so the release fits against the loop as it
    // is then (an undo during the drag may have moved the other point)
    const pointRef = useRef<number | null>(null);
    const [dragged, setDragged] = useState<LoopHandle | null>(null);
    const [lastTouched, setLastTouched] = useState<LoopHandle | null>(null);
    const [readoutWidth, setReadoutWidth] = useState(0);
    const { width } = viewport;
    const loop = { loopStart, loopEnd };
    const startX = sampleToX(viewport, loopStart);
    const endX = sampleToX(viewport, loopEnd);
    const lefts = getHandleLefts(startX, endX, width, lastTouched);

    const getPoint = (e: React.PointerEvent) => {
        const rect = layerRef.current?.getBoundingClientRect();
        return xToSample(viewport, e.clientX - (rect?.left ?? 0));
    };
    const getProperty = (handle: LoopHandle) =>
        handle === "start" ? "loopStart" : "loopEnd";

    const endDrag = () => {
        pointRef.current = null;
        setDragged(null);
        onPreviewChange(null);
    };

    // A layer that goes away mid drag (another sample, a closed section) leaves no preview
    const dropPreview = useEffectEvent(() => {
        if (pointRef.current !== null) {
            onPreviewChange(null);
        }
    });
    useEffect(() => dropPreview, []);

    const renderHandle = (handle: LoopHandle) => {
        const property = getProperty(handle);
        const lineX = handle === "start" ? startX : endX;
        // The dragged handle stays, or a drag past the edge of a zoomed view would lose its pointer
        if (dragged !== handle && !isHandleVisible(lineX, width)) {
            return null;
        }
        const left = lefts[handle];
        return (
            <button
                key={handle}
                type={"button"}
                role={"slider"}
                className={`wave_touch_handle wave_touch_handle_${handle}`}
                data-top={lefts.top === handle}
                aria-label={t(
                    handle === "start"
                        ? "phoneLocale.wave.loopStartHandle"
                        : "phoneLocale.wave.loopEndHandle"
                )}
                aria-valuemin={handle === "start" ? 0 : loopStart}
                aria-valuemax={handle === "start" ? loopEnd : sampleLength}
                aria-valuenow={loop[property]}
                style={{
                    "--handle-left": `${left}px`,
                    // The mark stays on the line while the hit box keeps off the edges
                    "--mark-x": `${Math.min(Math.max(lineX - left, 0), HANDLE_SIZE)}px`
                }}
                onPointerDown={(e) => {
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setDragged(handle);
                    setLastTouched(handle);
                    pointRef.current = getPoint(e);
                    onPreviewChange({
                        property,
                        point: fitLoopPoint(
                            property,
                            pointRef.current,
                            loop,
                            sampleLength
                        )
                    });
                }}
                onPointerMove={(e) => {
                    e.stopPropagation();
                    if (dragged !== handle) {
                        return;
                    }
                    pointRef.current = getPoint(e);
                    onPreviewChange({
                        property,
                        point: fitLoopPoint(
                            property,
                            pointRef.current,
                            loop,
                            sampleLength
                        )
                    });
                }}
                onPointerUp={(e) => {
                    e.stopPropagation();
                    const point = pointRef.current;
                    if (dragged !== handle || point === null) {
                        return;
                    }
                    // The other point is the stored one, so this fits as the steppers do
                    const fitted = fitLoopPoint(
                        property,
                        point,
                        loop,
                        sampleLength
                    );
                    endDrag();
                    if (handle === "start") {
                        onLoopStartChange(fitted);
                    } else {
                        onLoopEndChange(fitted);
                    }
                }}
                onPointerCancel={(e) => {
                    e.stopPropagation();
                    if (dragged === handle) {
                        endDrag();
                    }
                }}
                onLostPointerCapture={() => {
                    // After a pointerup the drag has ended already, otherwise nothing commits
                    if (dragged === handle && pointRef.current !== null) {
                        endDrag();
                    }
                }}
                onKeyDown={(e) => {
                    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
                        return;
                    }
                    e.preventDefault();
                    const by =
                        (e.key === "ArrowLeft" ? -1 : 1) *
                        (e.shiftKey ? 100 : 1);
                    setLastTouched(handle);
                    if (handle === "start") {
                        onStepLoopStart(by);
                    } else {
                        onStepLoopEnd(by);
                    }
                }}
            >
                <span className={"wave_touch_mark"} />
            </button>
        );
    };

    const draggedPoint = dragged === null ? null : loop[getProperty(dragged)];
    const draggedX = dragged === "start" ? startX : endX;
    return (
        <div ref={layerRef} className={"wave_touch_layer"}>
            {draggedPoint === null ? null : (
                <div
                    ref={(node) => {
                        if (node) {
                            setReadoutWidth(node.offsetWidth);
                        }
                    }}
                    className={
                        "wave_view_text wave_view_hover monospaced wave_touch_readout"
                    }
                    style={{
                        "--readout-left": `${getReadoutLeft(draggedX, readoutWidth, width)}px`
                    }}
                >
                    <span>{draggedPoint}</span>
                    <span>
                        {t("sampleLocale.milliseconds", {
                            milliseconds: Math.round(
                                (draggedPoint / sampleRate) * 1000
                            )
                        })}
                    </span>
                </div>
            )}
            {renderHandle("start")}
            {renderHandle("end")}
        </div>
    );
}
