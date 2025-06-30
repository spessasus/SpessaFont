import type { HistoryAction } from "../../core_backend/history.ts";
import type { BasicSample } from "spessasynth_core";
import type { SetViewType } from "../../bank_editor/bank_editor.tsx";
import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";

export class CreateSampleAction implements HistoryAction {
    private readonly sample: BasicSample;
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
        b.samples = [...b.samples, this.sample];
        this.setSamples(b.samples);
        this.setView(this.sample);
    }

    undo(b: SoundBankManager) {
        b.samples = b.samples.filter((s) => s !== this.sample);
        this.setSamples(b.samples);
        this.setView(b.samples?.[0] ?? "info");
    }
}
