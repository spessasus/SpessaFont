import type { HistoryAction } from "../../core_backend/history.ts";
import { Modulator } from "spessasynth_core";
import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";

export class SetDefaultModulators implements HistoryAction {
    private readonly callback: () => void;
    private readonly oldVal: Modulator[];
    private readonly newVal: Modulator[];

    constructor(
        callback: () => void,
        newVal: Modulator[],
        oldVal: Modulator[]
    ) {
        this.callback = callback;
        this.oldVal = oldVal;
        this.newVal = newVal;
    }

    do(b: SoundBankManager) {
        b.defaultModulators = [...this.newVal];
        this.callback();
    }

    undo(b: SoundBankManager) {
        b.defaultModulators = [...this.oldVal];
        this.callback();
    }
}
