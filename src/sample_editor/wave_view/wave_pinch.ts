import { clamp } from "../../generator_table/generator_range.ts";

/**
 * The zoom of a pinch: the zoom it started at, scaled by how far the fingers moved apart,
 * kept between 1 and the sample's maximum.
 */
export function getPinchZoom({
    startZoom,
    startDistance,
    distance,
    maxZoom
}: {
    startZoom: number;
    startDistance: number;
    distance: number;
    maxZoom: number;
}) {
    return clamp((startZoom * distance) / startDistance, 1, maxZoom);
}

/**
 * The scroll position after a zoom that keeps the sample under `centerX` (in view pixels)
 * where it was. The slider zooms around the middle of the view, a pinch around its fingers.
 */
export function getPinchScroll({
    centerX,
    scrollX,
    oldZoom,
    newZoom
}: {
    centerX: number;
    scrollX: number;
    oldZoom: number;
    newZoom: number;
}) {
    return Math.max(0, ((scrollX + centerX) / oldZoom) * newZoom - centerX);
}
