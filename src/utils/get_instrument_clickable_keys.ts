import type { BasicZone, GenericRange } from "spessasynth_core";

export function getZoneSplits(
    zones: BasicZone[],
    global: GenericRange
): GenericRange[] {
    const splits: GenericRange[] = [];
    for (let {
        keyRange: { min, max }
    } of zones) {
        if (min === -1) {
            min = global.min;
            max = global.max;
        }
        // don't add out of range
        if (max < global.min || min > global.max) {
            continue;
        }
        // clamp in range
        max = Math.min(global.max, max);
        min = Math.max(global.min, min);
        splits.push({ min, max });
    }
    return splits;
}
