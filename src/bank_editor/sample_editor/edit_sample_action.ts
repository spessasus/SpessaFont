import type { HistoryAction } from "../../core_backend/history.ts";
import type { BasicSample, BasicSoundBank } from "spessasynth_core";

export class EditSampleAction implements HistoryAction {
    private readonly sampleIndex: number;
    private readonly before: Partial<BasicSample>;
    private readonly after: Partial<BasicSample>;
    private readonly setSamples: (s: BasicSample[]) => void;

    constructor(
        sampleIndex: number,
        setSamples: (s: BasicSample[]) => void,
        before: Partial<BasicSample>,
        after: Partial<BasicSample>
    ) {
        this.sampleIndex = sampleIndex;
        this.before = before;
        this.after = after;
        this.setSamples = setSamples;
    }

    do(b: BasicSoundBank) {
        this.apply(b, this.after);
    }

    undo(b: BasicSoundBank) {
        this.apply(b, this.before);
    }

    private apply(b: BasicSoundBank, patch: Partial<BasicSample>) {
        const s = b.samples[this.sampleIndex];
        Object.assign(s, patch);
        this.setSamples([...b.samples]);
    }
}
