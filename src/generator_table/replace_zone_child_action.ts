import {
    BasicInstrument,
    BasicInstrumentZone,
    type BasicPreset,
    type BasicPresetZone,
    BasicSample
} from "spessasynth_core";
import type { HistoryAction } from "../core_backend/history.ts";
import type { BankDocument } from "../core_backend/bank_document.ts";
import type { ChangeSet } from "../core_backend/change_set.ts";

/**
 * Gives a zone another sample (instrument zone) or instrument (preset zone), keeping its
 * generators and modulators.
 */
export class ReplaceZoneChildAction implements HistoryAction {
    private readonly element: BasicPreset | BasicInstrument;
    private readonly zone: BasicPresetZone | BasicInstrumentZone;
    private readonly previous: BasicInstrument | BasicSample;
    private readonly next: BasicInstrument | BasicSample;

    public readonly label = "replaceZoneChild";

    public constructor(
        element: BasicPreset | BasicInstrument,
        zone: BasicPresetZone | BasicInstrumentZone,
        next: BasicInstrument | BasicSample
    ) {
        this.element = element;
        this.zone = zone;
        this.previous =
            zone instanceof BasicInstrumentZone ? zone.sample : zone.instrument;
        this.next = next;
    }

    private setChild(changes: ChangeSet, child: BasicInstrument | BasicSample) {
        // The setters unlink the old child and link the new one
        if (this.zone instanceof BasicInstrumentZone) {
            if (!(child instanceof BasicSample)) {
                throw new TypeError("An instrument zone needs a sample.");
            }
            this.zone.sample = child;
        } else {
            if (!(child instanceof BasicInstrument)) {
                throw new TypeError("A preset zone needs an instrument.");
            }
            this.zone.instrument = child;
        }
        changes.touch(this.element, this.previous, this.next);
        changes.focusOn(this.element);
    }

    public do(_document: BankDocument, changes: ChangeSet) {
        this.setChild(changes, this.next);
    }

    public undo(_document: BankDocument, changes: ChangeSet) {
        this.setChild(changes, this.previous);
    }
}

/**
 * Replaces the sample of a column. A stereo column picked a stereo sample gets both halves,
 * each in the zone of the same side. Otherwise only the column's own zone changes.
 */
export function createReplaceSampleActions(
    instrument: BasicInstrument,
    zone: BasicInstrumentZone,
    linkedZone: BasicInstrumentZone | undefined,
    picked: BasicSample
) {
    const partner = picked.linkedSample;
    if (!linkedZone || !partner) {
        return [new ReplaceZoneChildAction(instrument, zone, picked)];
    }
    const [forZone, forLinked] =
        picked.sampleType === zone.sample.sampleType
            ? [picked, partner]
            : [partner, picked];
    return [
        new ReplaceZoneChildAction(instrument, zone, forZone),
        new ReplaceZoneChildAction(instrument, linkedZone, forLinked)
    ];
}
