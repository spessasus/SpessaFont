import type { HistoryAction } from "../../core_backend/history.ts";
import {
    type BasicZone,
    generatorTypes,
    type SoundFontRange
} from "spessasynth_core";

export class SetRangeAction implements HistoryAction {
    private readonly zone: BasicZone;
    private readonly generator:
        | generatorTypes.keyRange
        | generatorTypes.velRange;
    private readonly previousValue: SoundFontRange;
    private readonly newValue: SoundFontRange;
    private readonly callback: () => unknown;

    constructor(
        zone: BasicZone,
        generator: generatorTypes.keyRange | generatorTypes.velRange,
        previousValue: SoundFontRange,
        newValue: SoundFontRange,
        callback: () => unknown
    ) {
        this.zone = zone;
        this.generator = generator;
        this.previousValue = previousValue;
        this.newValue = newValue;
        this.callback = callback;
    }

    do() {
        if (this.generator === generatorTypes.velRange) {
            this.zone.velRange = this.newValue;
        } else {
            this.zone.keyRange = this.newValue;
        }
        this.callback();
    }

    undo() {
        if (this.generator === generatorTypes.velRange) {
            this.zone.velRange = this.previousValue;
        } else {
            this.zone.keyRange = this.previousValue;
        }
        this.callback();
    }
}
