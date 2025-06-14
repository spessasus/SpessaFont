import type { HistoryAction } from "../../../core_backend/history.ts";
import type { BasicSample, BasicSoundBank } from "spessasynth_core";
import type { SetViewType } from "../../bank_editor.tsx";

export class DeleteSampleAction implements HistoryAction {
    private removedSample?: BasicSample;
    private readonly index: number;
    private readonly setSamples: (s: BasicSample[]) => void;
    private readonly setView: SetViewType;

    constructor(
        index: number,
        setSamples: (s: BasicSample[]) => void,
        setView: SetViewType
    ) {
        this.index = index;
        this.setSamples = setSamples;
        this.setView = setView;
    }

    do(b: BasicSoundBank) {
        this.removedSample = b.samples.splice(this.index, 1)[0];
        this.setSamples([...b.samples]);
        // check if there are samples to switch to
        if (b.samples.length > 0) {
            this.setView(b.samples[Math.max(this.index - 1, 0)]);
        } else {
            this.setView("info");
        }
    }

    undo(b: BasicSoundBank) {
        if (!this.removedSample) {
            return;
        }
        b.samples.splice(this.index, 0, this.removedSample);
        this.setSamples([...b.samples]);
        this.setView(this.removedSample);
    }
}
