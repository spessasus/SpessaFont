import type { BasicZone, KeyRange } from "spessasynth_core";

export function getZoneSplits(
    zones: BasicZone[],
    global: KeyRange
): KeyRange[] {
    const splits: KeyRange[] = [];
    zones.forEach(({ keyRange: { min, max } }) => {
        if (min === -1) {
            min = global.min;
            max = global.max;
        }
        // don't add out of range
        if (max < global.min || min > global.max) {
            return;
        }
        // clamp in range
        max = Math.min(global.max, max);
        min = Math.max(global.min, min);
        splits.push({ min, max });
    });
    return splits;
}
