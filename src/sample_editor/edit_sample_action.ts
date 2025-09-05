import type { HistoryAction } from "../core_backend/history.ts";
import type { BasicSample } from "spessasynth_core";

export class EditSampleAction<K extends keyof BasicSample>
    implements HistoryAction
{
    private readonly sample: BasicSample;
    private readonly propertyName: K;
    private readonly before: BasicSample[K];
    private readonly after: BasicSample[K];
    private readonly callback: () => unknown;

    constructor(
        sample: BasicSample,
        propertyName: K,
        before: BasicSample[K],
        after: BasicSample[K],
        callback: () => unknown
    ) {
        this.sample = sample;
        this.before = before;
        this.after = after;
        this.propertyName = propertyName;
        this.callback = callback;
    }

    do() {
        this.sample[this.propertyName] = this.after;
        this.callback();
    }

    undo() {
        this.sample[this.propertyName] = this.before;
        this.callback();
    }
}
