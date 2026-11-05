import type * as React from "react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { KEY_COUNT } from "./key_curve.ts";

export interface CurveMarker {
    /**
     * A stable key for the list, the zone's view id.
     */
    id: number;
    key: number;
    /**
     * The curve's value there, from 0 to 1.
     */
    value: number;
    isIncluded: boolean;
}

interface KeyCurveGraphProps {
    values: readonly number[];
    markers: readonly CurveMarker[];
    minLabel: string;
    maxLabel: string;
    /**
     * A click picks a key, `isEnd` for a right click. Undefined when clicks do nothing.
     */
    onPickKey: ((key: number, isEnd: boolean) => void) | undefined;
    /**
     * A drag from one key and value (0 to 1) to another draws the curve. Undefined when the
     * curve is not drawn.
     */
    onDraw:
        | ((
              from: { key: number; value: number },
              to: { key: number; value: number }
          ) => void)
        | undefined;
}

const HEIGHT = 100;

/**
 * Where the pointer is over the graph, as a key and a value from 0 (bottom) to 1.
 */
function getPoint(
    e: React.PointerEvent<SVGSVGElement> | React.MouseEvent<SVGSVGElement>
) {
    const box = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width;
    const y = (e.clientY - box.top) / box.height;
    return {
        key: Math.max(
            0,
            Math.min(KEY_COUNT - 1, Math.round(x * (KEY_COUNT - 1)))
        ),
        value: Math.max(0, Math.min(1, 1 - y))
    };
}

/**
 * The curve over the 128 keys, with a dot on the key of each zone it sets.
 */
export function KeyCurveGraph({
    values,
    markers,
    minLabel,
    maxLabel,
    onPickKey,
    onDraw
}: KeyCurveGraphProps) {
    const { t } = useTranslation();
    // The last point of a drag, so the next one draws a line from it
    const lastPoint = useRef<{ key: number; value: number } | null>(null);
    const toY = (value: number) => HEIGHT - value * HEIGHT;
    const path = values
        .map((v, key) => `${key === 0 ? "M" : "L"}${key} ${toY(v)}`)
        .join(" ");
    return (
        <div className={"key_curve_graph"}>
            <div className={"key_curve_graph_labels"}>
                <span>{maxLabel}</span>
                <span>{minLabel}</span>
            </div>
            <svg
                viewBox={`0 0 ${KEY_COUNT - 1} ${HEIGHT}`}
                preserveAspectRatio={"none"}
                role={"img"}
                aria-label={t("toolsLocale.keyCurve.graph")}
                onClick={(e) => onPickKey?.(getPoint(e).key, false)}
                onContextMenu={(e) => {
                    if (!onPickKey) {
                        return;
                    }

                    e.preventDefault();
                    onPickKey(getPoint(e).key, true);
                }}
                onPointerDown={(e) => {
                    if (!onDraw || e.button !== 0) {
                        return;
                    }
                    e.currentTarget.setPointerCapture(e.pointerId);
                    const point = getPoint(e);
                    lastPoint.current = point;
                    onDraw(point, point);
                }}
                onPointerMove={(e) => {
                    const from = lastPoint.current;
                    if (!onDraw || !from) {
                        return;
                    }
                    const point = getPoint(e);
                    lastPoint.current = point;
                    onDraw(from, point);
                }}
                onPointerUp={() => {
                    lastPoint.current = null;
                }}
            >
                <line
                    className={"key_curve_axis"}
                    x1={0}
                    x2={KEY_COUNT - 1}
                    y1={HEIGHT / 2}
                    y2={HEIGHT / 2}
                />
                <path className={"key_curve_line"} d={path} />
                {markers.map((marker) => (
                    <circle
                        key={marker.id}
                        className={
                            marker.isIncluded
                                ? "key_curve_marker"
                                : "key_curve_marker excluded"
                        }
                        cx={marker.key}
                        cy={toY(marker.value)}
                        r={1.5}
                    />
                ))}
            </svg>
            <div className={"key_curve_graph_keys"}>
                <span>{0}</span>
                <span>{KEY_COUNT - 1}</span>
            </div>
        </div>
    );
}
