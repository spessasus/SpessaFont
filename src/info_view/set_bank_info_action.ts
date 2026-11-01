import type { SoundBankInfoData } from "spessasynth_core";
import type { HistoryAction } from "../core_backend/history.ts";
import type SoundBankManager from "../core_backend/sound_bank_manager.ts";

export class SetBankInfo<
    K extends keyof SoundBankInfoData
> implements HistoryAction {
    private readonly oldVal: NonNullable<SoundBankInfoData[K]>;
    private readonly newVal: NonNullable<SoundBankInfoData[K]>;
    private readonly fourCC: K;
    callback: (s: NonNullable<SoundBankInfoData[K]>) => void;

    constructor(
        callback: (s: NonNullable<SoundBankInfoData[K]>) => void,
        oldVal: NonNullable<SoundBankInfoData[K]>,
        newVal: NonNullable<SoundBankInfoData[K]>,
        fourCC: K
    ) {
        this.callback = callback;
        this.oldVal = oldVal;
        this.newVal = newVal;
        this.fourCC = fourCC;
    }

    do(b: SoundBankManager) {
        b.soundBankInfo[this.fourCC] = this.newVal;
        this.callback(this.newVal);
    }

    undo(b: SoundBankManager) {
        b.soundBankInfo[this.fourCC] = this.oldVal;
        this.callback(this.oldVal);
    }
}
