import type {
    BasicInstrument,
    BasicPreset,
    BasicZone,
    GeneratorType
} from "spessasynth_core";
import type { HistoryAction } from "../../core_backend/history.ts";
import type { BankDocument } from "../../core_backend/bank_document.ts";
import type { ChangeSet } from "../../core_backend/change_set.ts";

export class SetGeneratorAction implements HistoryAction {
    private readonly element: BasicPreset | BasicInstrument;
    private readonly zone: BasicZone;
    private readonly generator: GeneratorType;
    private readonly previousValue: number | null;
    private readonly newValue: number | null;
    /**
     * Where a cleared generator was, so undo puts it back there and not at the end.
     */
    private removedIndex = -1;

    /**
     * @param element the preset or instrument that owns the zone
     * @param zone the zone to edit (may be the global zone)
     * @param generator the generator type
     * @param previousValue the current value, null if unset
     * @param newValue the new value, null to unset
     */
    public readonly label = "editGenerator";

    public constructor(
        element: BasicPreset | BasicInstrument,
        zone: BasicZone,
        generator: GeneratorType,
        previousValue: number | null,
        newValue: number | null
    ) {
        this.element = element;
        this.zone = zone;
        this.generator = generator;
        this.previousValue = previousValue;
        this.newValue = newValue;
    }

    public do(_document: BankDocument, changes: ChangeSet) {
        if (this.newValue === null) {
            this.removedIndex = this.zone.generators.findIndex(
                (g) => g.type === this.generator
            );
        }
        this.zone.setGenerator(this.generator, this.newValue, false);
        changes.touch(this.element);
    }

    public undo(_document: BankDocument, changes: ChangeSet) {
        this.zone.setGenerator(this.generator, this.previousValue, false);
        // Setting a generator the zone lacks appends it
        const { generators } = this.zone;
        if (this.previousValue !== null && this.removedIndex !== -1) {
            const restored = generators.pop();
            if (restored) {
                generators.splice(this.removedIndex, 0, restored);
            }
        }
        changes.touch(this.element);
    }
}
