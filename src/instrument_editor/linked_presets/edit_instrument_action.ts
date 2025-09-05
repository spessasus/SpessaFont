import type { HistoryAction } from "../../core_backend/history.ts";
import type { BasicInstrument } from "spessasynth_core";

export class EditInstrumentAction<K extends keyof BasicInstrument>
    implements HistoryAction
{
    private readonly instrument: BasicInstrument;
    private readonly propertyName: K;
    private readonly before: BasicInstrument[K];
    private readonly after: BasicInstrument[K];
    private readonly callback: () => unknown;

    constructor(
        instrument: BasicInstrument,
        propertyName: K,
        before: BasicInstrument[K],
        after: BasicInstrument[K],
        callback: () => unknown
    ) {
        this.instrument = instrument;
        this.before = before;
        this.after = after;
        this.propertyName = propertyName;
        this.callback = callback;
    }

    do() {
        this.instrument[this.propertyName] = this.after;
        this.callback();
    }

    undo() {
        this.instrument[this.propertyName] = this.before;
        this.callback();
    }
}
