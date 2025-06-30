import type { HistoryAction } from "../../core_backend/history.ts";
import type { BasicInstrument } from "spessasynth_core";
import type { SetViewType } from "../../bank_editor/bank_editor.tsx";
import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";

export class CreateInstrumentAction implements HistoryAction {
    private readonly instrument: BasicInstrument;
    private index: number;
    private readonly setInstruments: (s: BasicInstrument[]) => void;
    private readonly setView: SetViewType;

    constructor(
        instrument: BasicInstrument,
        setInstruments: (s: BasicInstrument[]) => void,
        index: number,
        setView: SetViewType
    ) {
        this.instrument = instrument;
        this.index = index;
        this.setInstruments = setInstruments;
        this.setView = setView;
    }

    do(b: SoundBankManager) {
        if (this.index === -1 || this.index > b.instruments.length) {
            this.index = b.instruments.length;
        }
        b.instruments.splice(this.index, 0, this.instrument);
        this.setInstruments([...b.instruments]);
        this.setView(this.instrument);
    }

    undo(b: SoundBankManager) {
        b.instruments.splice(this.index, 1);
        this.setInstruments([...b.instruments]);
        this.setView("info");
    }
}
