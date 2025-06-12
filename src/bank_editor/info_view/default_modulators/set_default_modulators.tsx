import type { HistoryAction } from "../../../core_backend/history.ts";
import { type BasicSoundBank, Modulator } from "spessasynth_core";

export class SetDefaultModulators implements HistoryAction {
    setDmods: (d: Modulator[]) => void;
    oldVal: Modulator[];
    newVal: Modulator[];

    constructor(
        setDmods: (d: Modulator[]) => void,
        newVal: Modulator[],
        oldVal: Modulator[]
    ) {
        this.setDmods = setDmods;
        this.oldVal = oldVal;
        this.newVal = newVal;
    }

    do(b: BasicSoundBank) {
        b.defaultModulators = this.newVal;
        this.setDmods(this.newVal);
    }

    undo(b: BasicSoundBank) {
        b.defaultModulators = this.oldVal;
        this.setDmods(this.oldVal);
    }
}
