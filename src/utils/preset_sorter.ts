import type { BasicPreset } from "spessasynth_core";

export function presetSorter(a: BasicPreset, b: BasicPreset) {
    // Force drum presets to be last
    if (a.isAnyDrums && b.isAnyDrums) return a.program - b.program;
    if (a.isAnyDrums && !b.isAnyDrums) return 1;
    if (!a.isAnyDrums && b.isAnyDrums) return -1;

    if (a.program !== b.program) {
        return a.program - b.program;
    }

    if (a.bankMSB !== b.bankMSB) {
        return a.bankMSB - b.bankMSB;
    }

    return a.bankLSB - b.bankLSB;
}
