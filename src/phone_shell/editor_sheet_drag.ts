const DRAG_THRESHOLD = 48;

/**
 * What a drag on an editor sheet's grab bar does when it ends.
 * @param isFull whether the sheet is at full height now
 * @param deltaY the vertical drag distance in pixels, negative is up
 */
export function getSheetDragResult(isFull: boolean, deltaY: number) {
    if (deltaY <= -DRAG_THRESHOLD) {
        return "full";
    }
    if (deltaY >= DRAG_THRESHOLD) {
        return isFull ? "normal" : "close";
    }
    return isFull ? "full" : "normal";
}
