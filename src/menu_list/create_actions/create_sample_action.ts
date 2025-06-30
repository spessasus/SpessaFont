import type { HistoryAction } from "../../core_backend/history.ts";
import type { BasicSample } from "spessasynth_core";
import type { SetViewType } from "../../bank_editor/bank_editor.tsx";
import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";

export class CreateSampleAction implements HistoryAction {
    private readonly sample: BasicSample;
    private index: number;
    private readonly setSamples: (s: BasicSample[]) => void;
    private readonly setView: SetViewType;

    constructor(
        sample: BasicSample,
        setSamples: (s: BasicSample[]) => void,
        index: number,
        setView: SetViewType
    ) {
        this.sample = sample;
        this.index = index;
        this.setSamples = setSamples;
        this.setView = setView;
    }

    do(b: SoundBankManager) {
        if (this.index === -1 || this.index > b.samples.length) {
            this.index = b.samples.length;
        }
        b.samples.splice(this.index, 0, this.sample);
        this.setSamples([...b.samples]);
        this.setView(this.sample);
    }

    undo(b: SoundBankManager) {
        b.samples.splice(this.index, 1);
        this.setSamples([...b.samples]);
        this.setView("info");
    }
}
