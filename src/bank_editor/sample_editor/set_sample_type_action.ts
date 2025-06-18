import type { HistoryAction } from "../../core_backend/history.ts";
import type { BasicSample, SampleTypeValue } from "spessasynth_core";

export class SetSampleTypeAction implements HistoryAction {
    private readonly sample: BasicSample;
    private readonly currentLink: BasicSample | undefined;
    private readonly currentType: SampleTypeValue;
    private readonly newLink: BasicSample | undefined;
    private readonly newType: SampleTypeValue;

    constructor(
        sample: BasicSample,
        currentLink: BasicSample | undefined,
        currentType: SampleTypeValue,
        newLink: BasicSample | undefined,
        newType: SampleTypeValue
    ) {
        this.sample = sample;
        this.currentLink = currentLink;
        this.newLink = newLink;
        this.currentType = currentType;
        this.newType = newType;
    }

    do() {
        this.apply(this.newLink, this.newType);
    }

    undo() {
        this.apply(this.currentLink, this.currentType);
    }

    private apply(newLink: BasicSample | undefined, newType: SampleTypeValue) {
        if (!newLink) {
            // mono
            this.sample.unlinkSample();
        } else {
            this.sample.setLinkedSample(newLink, newType);
        }
    }
}
