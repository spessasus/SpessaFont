import type { Modulator } from "spessasynth_core";

export class ClipBoardManager {
    private modulatorClipboard: Modulator[] = [];

    getModulators() {
        return this.modulatorClipboard;
    }

    setModulators(mods: Modulator[]) {
        console.log("set modulators", mods);
        this.modulatorClipboard = mods;
    }
}
