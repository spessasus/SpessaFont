import type { HistoryAction } from "../../core_backend/history.ts";
import type {
    BasicSample,
    BasicSoundBank,
    SampleTypeValue
} from "spessasynth_core";

export class SetSampleTypeAction implements HistoryAction {
    private readonly sampleIndex: number;
    private readonly currentLink: BasicSample | undefined;
    private readonly currentType: SampleTypeValue;
    private readonly newLink: BasicSample | undefined;
    private readonly newType: SampleTypeValue;

    constructor(
        sampleIndex: number,
        currentLink: BasicSample | undefined,
        currentType: SampleTypeValue,
        newLink: BasicSample | undefined,
        newType: SampleTypeValue
    ) {
        this.sampleIndex = sampleIndex;
        this.currentLink = currentLink;
        this.newLink = newLink;
        this.currentType = currentType;
        this.newType = newType;
    }

    do(b: BasicSoundBank) {
        this.apply(b.samples[this.sampleIndex], this.newLink, this.newType);
    }

    undo(b: BasicSoundBank) {
        this.apply(
            b.samples[this.sampleIndex],
            this.currentLink,
            this.currentType
        );
    }

    private apply(
        sample: BasicSample,
        newLink: BasicSample | undefined,
        newType: SampleTypeValue
    ) {
        if (!newLink) {
            // mono
            sample.unlinkSample();
        } else {
            sample.setLinkedSample(newLink, newType);
        }
    }
}
