import {
    type BasicInstrument,
    type BasicInstrumentZone,
    type BasicPreset,
    type BasicPresetZone,
    type BasicZone,
    GeneratorTypes,
    type GenericRange
} from "spessasynth_core";
import type { HistoryAction } from "../../core_backend/history.ts";
import type { BankDocument } from "../../core_backend/bank_document.ts";
import type { ChangeSet } from "../../core_backend/change_set.ts";
import type { RangeGenerator } from "./range_generator.ts";

export class SetRangeAction implements HistoryAction {
    private readonly element: BasicPreset | BasicInstrument;
    private readonly zone: BasicZone;
    private readonly generator: RangeGenerator;
    private readonly previousValue: GenericRange;
    private readonly newValue: GenericRange;
    private previousOrder = new Array<BasicPresetZone | BasicInstrumentZone>();

    public readonly label = "editRange";

    public constructor(
        element: BasicPreset | BasicInstrument,
        zone: BasicZone,
        generator: RangeGenerator,
        previousValue: GenericRange,
        newValue: GenericRange
    ) {
        this.element = element;
        this.zone = zone;
        this.generator = generator;
        this.previousValue = { ...previousValue };
        this.newValue = { ...newValue };
    }

    private setRange(range: GenericRange) {
        if (this.generator === GeneratorTypes.velRange) {
            this.zone.velRange = { ...range };
        } else {
            this.zone.keyRange = { ...range };
        }
    }

    public do(document: BankDocument, changes: ChangeSet) {
        this.previousOrder = [...this.element.zones];
        this.setRange(this.newValue);
        // Zones are kept in key order
        document.sortZones(this.element);
        changes.touch(this.element);
    }

    public undo(document: BankDocument, changes: ChangeSet) {
        this.setRange(this.previousValue);
        document.setZoneOrder(this.element, this.previousOrder);
        changes.touch(this.element);
    }
}
