import type { SoundBankInfoData } from "spessasynth_core";
import type { HistoryAction } from "../core_backend/history.ts";
import type { BankDocument } from "../core_backend/bank_document.ts";
import type { ChangeSet } from "../core_backend/change_set.ts";

export class SetBankInfoAction<
    K extends keyof SoundBankInfoData
> implements HistoryAction {
    private readonly fourCC: K;
    private readonly oldValue: SoundBankInfoData[K];
    private readonly newValue: SoundBankInfoData[K];

    public constructor(
        fourCC: K,
        oldValue: SoundBankInfoData[K],
        newValue: SoundBankInfoData[K]
    ) {
        this.fourCC = fourCC;
        this.oldValue = oldValue;
        this.newValue = newValue;
    }

    public do(document: BankDocument, changes: ChangeSet) {
        document.bank.soundBankInfo[this.fourCC] = this.newValue;
        changes.touchBankInfo();
    }

    public undo(document: BankDocument, changes: ChangeSet) {
        document.bank.soundBankInfo[this.fourCC] = this.oldValue;
        changes.touchBankInfo();
    }
}
