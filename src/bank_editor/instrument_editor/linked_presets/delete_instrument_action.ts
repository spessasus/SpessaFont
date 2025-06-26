import type { HistoryAction } from "../../../core_backend/history.ts";
import type { BasicInstrument } from "spessasynth_core";
import type { SetViewType } from "../../bank_editor.tsx";
import type SoundBankManager from "../../../core_backend/sound_bank_manager.ts";

export class DeleteInstrumentAction implements HistoryAction {
    private removed?: BasicInstrument;
    private readonly index: number;
    private readonly setInstruments: (s: BasicInstrument[]) => void;
    private readonly setView: SetViewType;

    constructor(
        index: number,
        setInstruments: (s: BasicInstrument[]) => void,
        setView: SetViewType
    ) {
        this.index = index;
        this.setInstruments = setInstruments;
        this.setView = setView;
    }

    do(b: SoundBankManager) {
        this.removed = b.instruments[this.index];
        b.deleteInstrument(this.removed);
        this.setInstruments([...b.instruments]);
        // check if there are elements to switch to
        if (b.instruments.length > 0) {
            this.setView(b.instruments[Math.max(this.index - 1, 0)]);
        } else {
            this.setView("info");
        }
    }

    undo(b: SoundBankManager) {
        if (!this.removed) {
            return;
        }
        b.instruments.splice(this.index, 0, this.removed);
        this.setInstruments([...b.instruments]);
        this.setView(this.removed);
    }
}
