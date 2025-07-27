import type { HistoryAction } from "../../core_backend/history.ts";
import type { BasicZone, GeneratorType } from "spessasynth_core";

export class SetGeneratorAction implements HistoryAction {
    private readonly zone: BasicZone;
    private readonly generator: GeneratorType;
    private readonly previousValue: number | null;
    private readonly newValue: number | null;
    private readonly callback: () => unknown;

    // null means "unset" (no generator)
    constructor(
        zone: BasicZone,
        generator: GeneratorType,
        previousValue: number | null,
        newValue: number | null,
        callback: () => unknown
    ) {
        this.generator = generator;
        this.zone = zone;
        this.previousValue = previousValue;
        this.newValue = newValue;
        this.callback = callback;
    }

    do() {
        if (this.newValue === null) {
            this.zone.generators = this.zone.generators.filter(
                (g) => g.generatorType !== this.generator
            );
        } else {
            this.zone.setGenerator(this.generator, this.newValue);
        }
        this.callback();
    }

    undo() {
        if (this.previousValue === null) {
            this.zone.generators = this.zone.generators.filter(
                (g) => g.generatorType !== this.generator
            );
        } else {
            this.zone.setGenerator(this.generator, this.previousValue);
        }
        this.callback();
    }
}
