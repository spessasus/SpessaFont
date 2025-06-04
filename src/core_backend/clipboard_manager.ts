import { Modulator } from "spessasynth_core";

export class ClipBoardManager {
    private modulatorClipboard: Modulator[] = [];

    getModulators() {
        return this.modulatorClipboard.map((m) => Modulator.copy(m));
    }

    setModulators(mods: Modulator[]) {
        this.modulatorClipboard = mods;
    }
}
