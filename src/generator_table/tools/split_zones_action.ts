import {
    BasicInstrument,
    BasicInstrumentZone,
    type BasicPreset,
    type BasicPresetZone,
    type GenericRange
} from "spessasynth_core";
import type { HistoryAction } from "../../core_backend/history.ts";
import type { BankDocument } from "../../core_backend/bank_document.ts";
import type { ChangeSet } from "../../core_backend/change_set.ts";
import { getPlayedRange } from "./key_curve_actions.ts";

type ElementZone = BasicPresetZone | BasicInstrumentZone;

export type SplitMode = "key" | "velocity";

export interface ZoneSplit {
    mode: SplitMode;
    /**
     * The width of each new zone, in keys or velocity steps.
     */
    step: number;
}

/**
 * The ranges a range becomes: `step` wide from its low end, the last one shorter if needed.
 */
export function getSplitRanges(range: GenericRange, step: number) {
    const { min, max } = getPlayedRange(range);
    const ranges = new Array<GenericRange>();
    for (let low = min; low <= max; low += step) {
        ranges.push({ min: low, max: Math.min(max, low + step - 1) });
    }
    return ranges;
}

/**
 * Zones split together: a zone, and for an instrument the stereo partner right after it with
 * the same ranges, so each new key keeps a left and right zone.
 */
function getSplitUnits(element: BasicPreset | BasicInstrument) {
    const zones: readonly ElementZone[] = element.zones;
    const units = new Array<ElementZone[]>();
    for (let i = 0; i < zones.length; i++) {
        const zone = zones[i];
        const next = zones[i + 1];
        const isPair =
            zone instanceof BasicInstrumentZone &&
            next instanceof BasicInstrumentZone &&
            zone.sample.linkedSample === next.sample &&
            zone.keyRange.min === next.keyRange.min &&
            zone.keyRange.max === next.keyRange.max &&
            zone.velRange.min === next.velRange.min &&
            zone.velRange.max === next.velRange.max;
        if (isPair) {
            units.push([zone, next]);
            i++;
        } else {
            units.push([zone]);
        }
    }
    return units;
}

function getRange(zone: ElementZone, mode: SplitMode) {
    return mode === "key" ? zone.keyRange : zone.velRange;
}

function setRange(zone: ElementZone, mode: SplitMode, range: GenericRange) {
    if (mode === "key") {
        zone.keyRange = { ...range };
    } else {
        zone.velRange = { ...range };
    }
}

/**
 * How many zones splitting the element's zones would make in all, and whether anything
 * would change.
 */
export function countSplitZones(
    element: BasicPreset | BasicInstrument,
    { mode, step }: ZoneSplit,
    only?: ReadonlySet<ElementZone>
) {
    let total = 0;
    let isChanged = false;
    for (const zone of element.zones) {
        const parts =
            only && !only.has(zone)
                ? 1
                : getSplitRanges(getRange(zone, mode), step).length;
        total += parts;
        isChanged ||= parts > 1;
    }
    return { total, isChanged };
}

/**
 * Splits zones into one zone per key (or velocity) or per `step` of them. Each new zone is a
 * full copy of its zone with a narrower range, in its place in the zone order. The zone itself
 * keeps the first range, so earlier actions that point to it stay valid. Undo restores the
 * exact zone list and order.
 */
export class SplitZonesAction implements HistoryAction {
    private readonly element: BasicPreset | BasicInstrument;
    private readonly split: ZoneSplit;
    private readonly only: ReadonlySet<ElementZone> | undefined;
    private previousOrder = new Array<ElementZone>();
    private nextOrder = new Array<ElementZone>();
    /**
     * Each split zone, its range before and the range it keeps.
     */
    private narrowed = new Array<{
        zone: ElementZone;
        before: GenericRange;
        after: GenericRange;
    }>();
    private created = new Array<ElementZone>();

    /**
     * @param element the preset or instrument
     * @param split how to split
     * @param only the zones to split (with their stereo partners), every zone by default
     */
    public readonly label = "splitZones";

    public constructor(
        element: BasicPreset | BasicInstrument,
        split: ZoneSplit,
        only?: ReadonlySet<ElementZone>
    ) {
        this.element = element;
        this.split = split;
        this.only = only;
    }

    private createZone(template: ElementZone) {
        const { element } = this;
        // Each branch narrows the pair so the matching createZone overload is used
        let zone: ElementZone;
        if (element instanceof BasicInstrument) {
            if (!(template instanceof BasicInstrumentZone)) {
                throw new TypeError("An instrument zone needs a sample.");
            }
            zone = element.createZone(template.sample);
        } else {
            if (template instanceof BasicInstrumentZone) {
                throw new TypeError("A preset zone needs an instrument.");
            }
            zone = element.createZone(template.instrument);
        }
        zone.copyFrom(template);
        return zone;
    }

    private get children() {
        return this.element.zones.map((z) =>
            z instanceof BasicInstrumentZone ? z.sample : z.instrument
        );
    }

    private splitFirstTime() {
        const { mode, step } = this.split;
        const order = new Array<ElementZone>();
        for (const unit of getSplitUnits(this.element)) {
            const ranges = getSplitRanges(getRange(unit[0], mode), step);
            if (
                ranges.length < 2 ||
                (this.only && unit.every((z) => !this.only?.has(z)))
            ) {
                order.push(...unit);
                continue;
            }
            for (const [r, range] of ranges.entries()) {
                for (const zone of unit) {
                    if (r === 0) {
                        this.narrowed.push({
                            zone,
                            before: { ...getRange(zone, mode) },
                            after: range
                        });
                        order.push(zone);
                        continue;
                    }
                    const copy = this.createZone(zone);
                    setRange(copy, mode, range);
                    this.created.push(copy);
                    order.push(copy);
                }
            }
        }
        this.nextOrder = order;
    }

    public do(document: BankDocument, changes: ChangeSet) {
        this.previousOrder = [...this.element.zones];
        if (this.nextOrder.length === 0) {
            this.splitFirstTime();
        } else {
            // Redo restores the same zone objects, so later actions that edit them stay valid
            for (const zone of this.created) {
                document.restoreZone(
                    this.element,
                    zone,
                    this.element.zones.length
                );
            }
        }
        for (const { zone, after } of this.narrowed) {
            setRange(zone, this.split.mode, after);
        }
        document.setZoneOrder(this.element, this.nextOrder);
        changes.touch(this.element, ...this.children);
    }

    public undo(document: BankDocument, changes: ChangeSet) {
        const children = this.children;
        for (const zone of this.created) {
            document.removeZone(this.element, zone);
        }
        for (const { zone, before } of this.narrowed) {
            setRange(zone, this.split.mode, before);
        }
        document.setZoneOrder(this.element, this.previousOrder);
        changes.touch(this.element, ...children);
    }
}
