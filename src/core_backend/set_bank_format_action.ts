import type { HistoryAction } from "./history.ts";
import type { BankDocument } from "./bank_document.ts";
import type { ChangeSet } from "./change_set.ts";
import type { BankFormat } from "./bank_format.ts";

export class SetBankFormatAction implements HistoryAction {
    private readonly oldFormat: BankFormat;
    private readonly newFormat: BankFormat;

    public readonly label = "changeFormat";

    public constructor(oldFormat: BankFormat, newFormat: BankFormat) {
        this.oldFormat = oldFormat;
        this.newFormat = newFormat;
    }

    public do(document: BankDocument, changes: ChangeSet) {
        document.format = this.newFormat;
        changes.touchFormat();
    }

    public undo(document: BankDocument, changes: ChangeSet) {
        document.format = this.oldFormat;
        changes.touchFormat();
    }
}
