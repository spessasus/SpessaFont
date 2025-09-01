import type { HistoryAction } from "../../core_backend/history.ts";
import {
    type BasicZone,
    type GeneratorType,
    generatorTypes,
    type GenericRange
} from "spessasynth_core";

export class SetRangeAction implements HistoryAction {
    private readonly zone: BasicZone;
    private readonly generator: GeneratorType;
    private readonly previousValue: GenericRange;
    private readonly newValue: GenericRange;
    private readonly callback: () => unknown;

    constructor(
        zone: BasicZone,
        generator: GeneratorType,
        previousValue: GenericRange,
        newValue: GenericRange,
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
