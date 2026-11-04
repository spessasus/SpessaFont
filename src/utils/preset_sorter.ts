import type { BasicPreset } from "spessasynth_core";

export function presetSorter(a: BasicPreset, b: BasicPreset) {
    // Force drum presets to be last
    if (a.isDrum !== b.isDrum) {
        return a.isDrum ? 1 : -1;
    }

    if (a.program !== b.program) {
        return a.program - b.program;
    }

    // Drum kits of one program are told apart by the bank numbers too
    if (a.bankMSB !== b.bankMSB) {
        return a.bankMSB - b.bankMSB;
    }

    return a.bankLSB - b.bankLSB;
}
