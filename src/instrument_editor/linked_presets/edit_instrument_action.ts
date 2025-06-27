import type { HistoryAction } from "../../core_backend/history.ts";
import type { BasicInstrument } from "spessasynth_core";
import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";

export class EditInstrumentAction<K extends keyof BasicInstrument>
    implements HistoryAction
{
    private readonly instrumentIndex: number;
    private readonly propertyName: K;
    private readonly before: BasicInstrument[K];
    private readonly after: BasicInstrument[K];
    private readonly callback: () => unknown;

    constructor(
        instrumentIndex: number,
        propertyName: K,
        before: BasicInstrument[K],
        after: BasicInstrument[K],
        callback: () => unknown
    ) {
        this.instrumentIndex = instrumentIndex;
        this.before = before;
        this.after = after;
        this.propertyName = propertyName;
        this.callback = callback;
    }

    do(b: SoundBankManager) {
        const instrument = b.instruments[this.instrumentIndex];
        instrument[this.propertyName] = this.after;
        this.callback();
    }

    undo(b: SoundBankManager) {
        const instrument = b.instruments[this.instrumentIndex];
        instrument[this.propertyName] = this.before;
        this.callback();
    }
}
