import type {
    BasicInstrumentZone,
    BasicSample,
    BasicZone
} from "spessasynth_core";

export const ZONE_SORTING_FUNCTION = (z1: BasicZone, z2: BasicZone) =>
    z1.keyRange.min - z2.keyRange.min;

// reorders so the stereo sample pairs appear immediately after each other
export function reorderInstrumentZones(
    zones: BasicInstrumentZone[]
): BasicInstrumentZone[] {
    const ordered: BasicInstrumentZone[] = [];
    const added = new Set<BasicInstrumentZone>();

    const sampleToZone = new Map<BasicSample, BasicInstrumentZone>();
    for (const zone of zones.toSorted(ZONE_SORTING_FUNCTION)) {
        sampleToZone.set(zone.sample, zone);
    }

    zones.forEach((z) => {
        if (added.has(z)) {
            return;
        }
        const link = z.sample.linkedSample;
        if (link) {
            const linkedZone = sampleToZone.get(link);
            if (linkedZone && !added.has(linkedZone)) {
                ordered.push(linkedZone);
                added.add(linkedZone);
            }
        }
        ordered.push(z);
        added.add(z);
    });
    return ordered;
}
