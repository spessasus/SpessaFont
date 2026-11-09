import type { LayoutMode } from "../../layout/layout_setting.ts";

/**
 * What the wave's click handlers need. The event type is generic so a test can pass a plain
 * object instead of a React event.
 */
export interface WaveClickSetters<E extends { preventDefault(): void }> {
    isLoaded: boolean;
    getSampleAt: (e: E) => number;
    onLoopStartChange: (loopStart: number) => void;
    onLoopEndChange: (loopEnd: number) => void;
}

/**
 * The wave's loop setters. On desktop a click sets the loop start and a right click the end.
 * A phone attaches none, so a tap does nothing and a swipe scrolls the zoomed wave.
 */
export function getWaveClickHandlers<E extends { preventDefault(): void }>(
    layout: LayoutMode,
    {
        isLoaded,
        getSampleAt,
        onLoopStartChange,
        onLoopEndChange
    }: WaveClickSetters<E>
): {
    onClick?: (e: E) => void;
    onContextMenu?: (e: E) => void;
} {
    if (layout === "phone") {
        return {};
    }
    return {
        onClick: (e) => {
            if (isLoaded) {
                onLoopStartChange(getSampleAt(e));
            }
        },
        onContextMenu: (e) => {
            e.preventDefault();
            if (isLoaded) {
                onLoopEndChange(getSampleAt(e));
            }
        }
    };
}
