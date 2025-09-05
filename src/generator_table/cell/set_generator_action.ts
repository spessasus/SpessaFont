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
        console.log("set", this.generator, "to", this.newValue);
        this.zone.setGenerator(this.generator, this.newValue);
        console.log(
            "new value",
            this.zone.getGenerator(this.generator, undefined),
            this.zone.generators
        );
        this.callback();
    }

    undo() {
        console.log("set", this.generator, "to", this.previousValue);
        this.zone.setGenerator(this.generator, this.previousValue);
        this.callback();
    }
}
