import type { HistoryAction } from "../../core_backend/history.ts";
import { type BasicSample } from "spessasynth_core";
import type { SetViewType } from "../../bank_editor/bank_editor.tsx";
import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";

export class DeleteSampleAction implements HistoryAction {
    private readonly sample: BasicSample;
    private sampleIndex?: number;
    private readonly setSamples: (s: BasicSample[]) => void;
    private readonly setView: SetViewType;

    constructor(
        sample: BasicSample,
        setSamples: (s: BasicSample[]) => void,
        setView: SetViewType
    ) {
        this.sample = sample;
        this.setSamples = setSamples;
        this.setView = setView;
    }

    do(b: SoundBankManager) {
        this.sampleIndex = b.samples.indexOf(this.sample);
        if (this.sampleIndex < 0) {
            throw new Error(
                `${this.sample.name} does not exist in ${b.soundBankInfo.name!}`
            );
        }
        // do not use deleteSample as it unlinks the other sample!
        b.samples.splice(this.sampleIndex, 1);
        this.setSamples([...b.samples]);
        // check if there are samples to switch to
        if (b.samples.length > 0) {
            this.setView(b.samples[Math.max(this.sampleIndex - 1, 0)]);
        } else {
            this.setView("info");
        }
    }

    undo(b: SoundBankManager) {
        if (this.sampleIndex === undefined) {
            return;
        }
        b.samples.splice(this.sampleIndex, 0, this.sample);
        this.setSamples([...b.samples]);
        this.setView(this.sample);
    }
}
