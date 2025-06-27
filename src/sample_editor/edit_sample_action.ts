import type { HistoryAction } from "../core_backend/history.ts";
import type { BasicSample } from "spessasynth_core";
import type SoundBankManager from "../core_backend/sound_bank_manager.ts";

export class EditSampleAction<K extends keyof BasicSample>
    implements HistoryAction
{
    private readonly sampleIndex: number;
    private readonly propertyName: K;
    private readonly before: BasicSample[K];
    private readonly after: BasicSample[K];
    private readonly callback: () => unknown;

    constructor(
        sampleIndex: number,
        propertyName: K,
        before: BasicSample[K],
        after: BasicSample[K],
        callback: () => unknown
    ) {
        this.sampleIndex = sampleIndex;
        this.before = before;
        this.after = after;
        this.propertyName = propertyName;
        this.callback = callback;
    }

    do(b: SoundBankManager) {
        const sample = b.samples[this.sampleIndex];
        sample[this.propertyName] = this.after;
        this.callback();
    }

    undo(b: SoundBankManager) {
        const sample = b.samples[this.sampleIndex];
        sample[this.propertyName] = this.before;
        this.callback();
    }
}
