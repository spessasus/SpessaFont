import {
    BasicInstrument,
    BasicPreset,
    type BasicZone,
    type Modulator
} from "spessasynth_core";
import type { HistoryAction } from "./history.ts";
import type { BankDocument } from "./bank_document.ts";
import type { ChangeSet } from "./change_set.ts";
import type { BankEntity } from "./bank_view.ts";
import {
    hasOwnDefaultModulators,
    syncResonanceCompensators
} from "./resonance_compensation.ts";

interface TwinEdit {
    element: BasicPreset | BasicInstrument;
    zone: BasicZone;
    before: Modulator[];
    after: Modulator[];
}

/**
 * The zones to change: those of the elements the group touched, or of every element when it
 * changed the default list, which decides the need for a twin everywhere.
 * @param existing the elements in the bank before a paste, which only touches the ones it
 * shares (for their usedBy) and leaves them as they are
 */
function findEdits(
    document: BankDocument,
    changes: ChangeSet,
    existing: ReadonlySet<BankEntity> | undefined
) {
    // Core gives twins only to banks it reads from SF2, a bank that saves as DLS gets none
    if (document.writeFormat === "dls") {
        return [];
    }
    const isTwinNeeded = !hasOwnDefaultModulators(
        document.bank.defaultModulators
    );
    const isEverywhere = changes.hasBankInfoChanged;
    const elements = isEverywhere
        ? [...document.instruments, ...document.presets]
        : [...changes.entities]
              .filter(
                  (e) =>
                      e instanceof BasicInstrument || e instanceof BasicPreset
              )
              .filter((e) => !existing?.has(e));
    const edits = new Array<TwinEdit>();
    for (const element of elements) {
        // Preset zones never get a twin
        const isNeeded = element instanceof BasicInstrument && isTwinNeeded;
        for (const zone of [element.globalZone, ...element.zones]) {
            const before = [...zone.modulators];
            const after = syncResonanceCompensators(before, isNeeded);
            if (after.length !== before.length) {
                edits.push({ element, zone, before, after });
            }
        }
    }
    return edits;
}

/**
 * Puts the resonance twins where core's SF2 reader would, for SF2 mode: in the instrument zones
 * that need one while the bank writes no default list, nowhere else. It goes last in a group
 * that may change that (an edit or a paste in SF2 mode), and works out what to change
 * when the group first runs, after the others. Redo sets the same modulators again.
 */
export class SyncResonanceTwinsAction implements HistoryAction {
    private edits: TwinEdit[] | undefined;
    private readonly existing: ReadonlySet<BankEntity> | undefined;

    public readonly label = undefined;

    /**
     * @param existing for a paste, the elements in the bank before it. Only the ones it adds
     * are synced then.
     */
    public constructor(existing?: ReadonlySet<BankEntity>) {
        this.existing = existing;
    }

    public do(document: BankDocument, changes: ChangeSet) {
        this.edits ??= findEdits(document, changes, this.existing);
        for (const { element, zone, after } of this.edits) {
            zone.setModulators(after);
            changes.touch(element);
        }
    }

    public undo(_document: BankDocument, changes: ChangeSet) {
        const edits = this.edits ?? [];
        for (const { element, zone, before } of edits) {
            zone.setModulators(before);
            changes.touch(element);
        }
    }
}
