import type * as React from "react";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import "./octave_strip.css";
import type { KeySplit } from "../utils/zone_splits.ts";
import {
    getMinimapSegments,
    getScrollForKey,
    getVisibleKeys
} from "./zone_minimap_math.ts";

const KEY_COUNT = 128;

interface ZoneMinimapProps {
    /**
     * The phone keyboard that the window follows and scrolls. Null while it is not shown.
     */
    keyboard: HTMLDivElement | null;
    splits: readonly KeySplit[] | undefined;
}

interface DragStart {
    x: number;
    scroll: number;
}

/**
 * All 128 keys as a thin bar with the shown element's key ranges as colored segments and a
 * window over the keys the keyboard shows. Dragging the window scrolls the keyboard.
 */
export function ZoneMinimap({ keyboard, splits }: ZoneMinimapProps) {
    const { t } = useTranslation();
    const drag = useRef<DragStart>(null);

    // Primitives only, so the snapshot stays equal until the keyboard scrolls or resizes
    const subscribe = useCallback(
        (onChange: () => void) => {
            if (!keyboard) {
                return () => {
                    // Nothing to listen to without the keyboard
                };
            }
            keyboard.addEventListener("scroll", onChange);
            const observer = new ResizeObserver(onChange);
            observer.observe(keyboard);
            return () => {
                keyboard.removeEventListener("scroll", onChange);
                observer.disconnect();
            };
        },
        [keyboard]
    );
    const geometry = useSyncExternalStore(subscribe, () =>
        keyboard
            ? `${keyboard.scrollLeft} ${keyboard.clientWidth} ${keyboard.scrollWidth}`
            : ""
    );
    const [scrollLeft = 0, clientWidth = 0, scrollWidth = 0] = geometry
        .split(" ")
        .map(Number);
    const visible =
        scrollWidth > 0
            ? getVisibleKeys(scrollLeft, clientWidth, scrollWidth)
            : undefined;

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!keyboard || (e.pointerType === "mouse" && e.button !== 0)) {
            return;
        }
        e.currentTarget.setPointerCapture(e.pointerId);
        const rect = e.currentTarget.getBoundingClientRect();
        let scroll = keyboard.scrollLeft;
        const grabbed = ((e.clientX - rect.left) / rect.width) * KEY_COUNT;
        const { first, last } = getVisibleKeys(
            keyboard.scrollLeft,
            keyboard.clientWidth,
            keyboard.scrollWidth
        );
        // A press beside the window centers it there, a press on it keeps its grip
        if (grabbed < first || grabbed >= last + 1) {
            scroll = getScrollForKey(
                Math.floor(grabbed),
                keyboard.clientWidth,
                keyboard.scrollWidth
            );
            keyboard.scrollTo({ left: scroll });
        }
        drag.current = { x: e.clientX, scroll };
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const start = drag.current;
        if (!keyboard || !start) {
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        keyboard.scrollTo({
            left:
                start.scroll +
                ((e.clientX - start.x) / rect.width) * keyboard.scrollWidth
        });
    };

    const endDrag = () => {
        drag.current = null;
    };

    return (
        <div
            className={"zone_minimap"}
            role={"img"}
            aria-label={t("phoneLocale.drawer.minimap")}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={endDrag}
        >
            {getMinimapSegments(splits ?? []).map((segment, index) => (
                <div
                    // Segments follow the zone columns, which are positional
                    key={index}
                    className={"zone_minimap_segment"}
                    data-color={segment.color}
                    style={{
                        "--start": segment.start,
                        "--span": segment.end - segment.start + 1
                    }}
                />
            ))}
            {visible ? (
                <div
                    className={"zone_minimap_window"}
                    style={{
                        "--start": visible.first,
                        "--span": visible.last - visible.first + 1
                    }}
                />
            ) : null}
        </div>
    );
}
