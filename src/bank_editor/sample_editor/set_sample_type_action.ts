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
    private readonly setSamples: (s: BasicSample[]) => void;

    constructor(
        sampleIndex: number,
        setSamples: (s: BasicSample[]) => void,
        currentLink: BasicSample | undefined,
        currentType: SampleTypeValue,
        newLink: BasicSample | undefined,
        newType: SampleTypeValue
    ) {
        this.sampleIndex = sampleIndex;
        this.setSamples = setSamples;
        this.currentLink = currentLink;
        this.newLink = newLink;
        this.currentType = currentType;
        this.newType = newType;
    }

    do(b: BasicSoundBank) {
        this.apply(b, this.newLink, this.newType);
    }

    undo(b: BasicSoundBank) {
        this.apply(b, this.currentLink, this.currentType);
    }

    private apply(
        b: BasicSoundBank,
        newLink: BasicSample | undefined,
        newType: SampleTypeValue
    ) {
        const s = b.samples[this.sampleIndex];
        if (!newLink) {
            // mono
            s.unlinkSample();
        } else {
            s.setLinkedSample(newLink, newType);
        }
        this.setSamples([...b.samples]);
    }
}
