import type { HistoryAction } from "../../core_backend/history.ts";
import { Modulator } from "spessasynth_core";
import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";

export class SetDefaultModulators implements HistoryAction {
    setDmods: (d: Modulator[]) => void;
    private readonly oldVal: Modulator[];
    private readonly newVal: Modulator[];

    constructor(
        setDmods: (d: Modulator[]) => void,
        newVal: Modulator[],
        oldVal: Modulator[]
    ) {
        this.setDmods = setDmods;
        this.oldVal = oldVal;
        this.newVal = newVal;
    }

    do(b: SoundBankManager) {
        b.defaultModulators = this.newVal;
        this.setDmods(this.newVal);
    }

    undo(b: SoundBankManager) {
        b.defaultModulators = this.oldVal;
        this.setDmods(this.oldVal);
    }
}
