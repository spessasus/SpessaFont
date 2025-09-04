import type { HistoryAction } from "../core_backend/history.ts";
import type { BasicSample, SampleType } from "spessasynth_core";

export class SetSampleTypeAction implements HistoryAction {
    private readonly sample: BasicSample;
    private readonly currentLink: BasicSample | undefined;
    private readonly currentType: SampleType;
    private readonly newLink: BasicSample | undefined;
    private readonly newType: SampleType;
    private readonly callback: () => void;

    constructor(
        sample: BasicSample,
        currentLink: BasicSample | undefined,
        currentType: SampleType,
        newLink: BasicSample | undefined,
        newType: SampleType,
        callback: () => void
    ) {
        this.callback = callback;
        this.sample = sample;
        this.currentLink = currentLink;
        this.newLink = newLink;
        this.currentType = currentType;
        this.newType = newType;
    }

    do() {
        this.apply(this.sample, this.newLink, this.newType);
    }

    undo() {
        this.apply(this.sample, this.currentLink, this.currentType);
    }

    private apply(
        sample: BasicSample,
        newLink: BasicSample | undefined,
        newType: SampleType
    ) {
        if (!newLink) {
            // mono
            sample.unlinkSample();
        } else {
            sample.setLinkedSample(newLink, newType);
        }
        this.callback();
    }
}
