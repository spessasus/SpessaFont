import type { HistoryAction } from "../../core_backend/history.ts";
import type { BasicInstrument } from "spessasynth_core";
import type { SetViewType } from "../../bank_editor/bank_editor.tsx";
import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";

export class CreateInstrumentAction implements HistoryAction {
    private readonly instrument: BasicInstrument;
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
        b.instruments = [...b.instruments, this.instrument];
        this.setInstruments(b.instruments);
        this.setView(this.instrument);
    }

    undo(b: SoundBankManager) {
        b.instruments = b.instruments.filter((i) => i !== this.instrument);
        this.setInstruments(b.instruments);
        this.setView(b.instruments?.[0] ?? "info");
    }
}
