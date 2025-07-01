import type { BasicZone, SoundFontRange } from "spessasynth_core";

export function getZonesClickableKeys(
    zones: BasicZone[],
    global: SoundFontRange
): boolean[] {
    const clickableBool: boolean[] = Array(128).fill(false);

    zones.forEach(({ keyRange: { min, max } }) => {
        if (min === -1) {
            min = global.min;
            max = global.max;
        }
        for (let i = Math.max(min, 0); i <= max; i++) {
            clickableBool[i] = true;
        }
    });
    return clickableBool;
}
