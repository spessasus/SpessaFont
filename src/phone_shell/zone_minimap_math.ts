import type { KeySplit } from "../utils/zone_splits.ts";

const KEY_COUNT = 128;

function getZoneColor(index: number) {
    switch (index % 4) {
        case 0: {
            return 1;
        }
        case 1: {
            return 2;
        }
        case 2: {
            return 3;
        }
        default: {
            return 4;
        }
    }
}

/**
 * The keys of each split as a colored segment. Colors cycle in the splits' order, which is the
 * zone column order.
 */
export function getMinimapSegments(splits: readonly KeySplit[]) {
    return splits.map((split, index) => ({
        start: split.keys.min,
        end: split.keys.max,
        color: getZoneColor(index)
    }));
}

/**
 * The first and last key the keyboard shows, from its scroll position. The 128 keys share
 * the scroll width evenly.
 */
export function getVisibleKeys(
    scrollLeft: number,
    clientWidth: number,
    scrollWidth: number
) {
    return {
        first: Math.floor((scrollLeft / scrollWidth) * KEY_COUNT),
        last:
            Math.ceil(((scrollLeft + clientWidth) / scrollWidth) * KEY_COUNT) -
            1
    };
}

/**
 * The scroll position that puts a key in the middle of the keyboard, kept inside the keys.
 */
export function getScrollForKey(
    key: number,
    clientWidth: number,
    scrollWidth: number
) {
    const scroll = Math.round(
        ((key + 0.5) / KEY_COUNT) * scrollWidth - clientWidth / 2
    );
    return Math.min(Math.max(scroll, 0), scrollWidth - clientWidth);
}

/**
 * The key halfway between the lowest and the highest key the splits play, or undefined
 * without splits.
 */
export function getSplitsCenter(splits: readonly KeySplit[] | undefined) {
    if (!splits || splits.length === 0) {
        return undefined;
    }
    let low = KEY_COUNT - 1;
    let high = 0;
    for (const split of splits) {
        low = Math.min(low, split.keys.min);
        high = Math.max(high, split.keys.max);
    }
    return Math.floor((low + high) / 2);
}
