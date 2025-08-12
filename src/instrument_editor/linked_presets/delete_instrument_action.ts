import type { HistoryAction } from "../../core_backend/history.ts";
import type { BasicInstrument } from "spessasynth_core";
import type { SetViewType } from "../../bank_editor/bank_editor.tsx";
import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";

export class DeleteInstrumentAction implements HistoryAction {
    private readonly instrument: BasicInstrument;
    private index?: number;
    private readonly setInstruments: (s: BasicInstrument[]) => void;
    private readonly setView: SetViewType;

    constructor(
        instrument: BasicInstrument,
        setInstruments: (s: BasicInstrument[]) => void,
        setView: SetViewType
    ) {
        this.instrument = instrument;
        this.setInstruments = setInstruments;
        this.setView = setView;
    }

    do(b: SoundBankManager) {
        this.index = b.instruments.indexOf(this.instrument);
        if (this.index < 0) {
            throw new Error(
                `${this.instrument.name} does not exist in ${b.soundBankInfo.name!}`
            );
        }
        b.deleteInstrument(this.instrument);
        this.setInstruments([...b.instruments]);
        // check if there are elements to switch to
        if (b.instruments.length > 0) {
            this.setView(b.instruments[Math.max(this.index - 1, 0)]);
        } else {
            this.setView("info");
        }
    }

    undo(b: SoundBankManager) {
        if (this.index === undefined) {
            return;
        }
        b.instruments.splice(this.index, 0, this.instrument);
        this.setInstruments([...b.instruments]);
        this.setView(this.instrument);
    }
}
