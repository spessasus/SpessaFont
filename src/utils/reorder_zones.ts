import type { BasicInstrumentZone, BasicZone } from "spessasynth_core";

export const ZONE_SORTING_FUNCTION = (z1: BasicZone, z2: BasicZone) =>
    (z1.keyRange.min - z2.keyRange.min) * 10 +
    (z1.velRange.min - z2.velRange.min);

// reorders so the stereo sample pairs appear immediately after each other
export function reorderInstrumentZones(
    zones: BasicInstrumentZone[]
): BasicInstrumentZone[] {
    const ordered: BasicInstrumentZone[] = [];
    const added = new Set<BasicInstrumentZone>();
    zones = zones.toSorted(ZONE_SORTING_FUNCTION);

    // reorder so the stereo sample pairs appear immediately after each other
    zones.forEach((z) => {
        if (added.has(z)) {
            return;
        }
        const link = z.sample.linkedSample;

        // sophisticated piece of code that finds matching zone based on range,
        // as there may be multiple pairs in an instrument!
        // I love making things unnecessarily difficult for myself
        if (link) {
            // get all zones linked to this sample
            const links = Array.from(zones).filter(
                (lz) => lz.sample === link && !added.has(lz)
            );

            if (links.length > 0) {
                if (links.length === 1) {
                    ordered.push(links[0]);
                    added.add(links[0]);
                } else {
                    // pick the best match based on key and velocity range similarity
                    let velMatch = links[0];
                    let keyMatch: BasicInstrumentZone | null = null;
                    let bothMatch: BasicInstrumentZone | null = null;
                    let perfectMatch: BasicInstrumentZone | null = null;
                    for (const potentialLink of links) {
                        const keyMatches =
                            potentialLink.keyRange.min === z.keyRange.min &&
                            potentialLink.keyRange.max === z.keyRange.max;
                        const velMatches =
                            potentialLink.velRange.min === z.velRange.min &&
                            potentialLink.velRange.max === z.velRange.max;
                        if (keyMatches && velMatches) {
                            if (
                                potentialLink.modulators.length ===
                                    z.modulators.length &&
                                potentialLink.generators.length ===
                                    z.generators.length
                            ) {
                                perfectMatch = potentialLink;
                                break;
                            } else {
                                bothMatch = potentialLink;
                            }
                        } else if (keyMatches) {
                            keyMatch = potentialLink;
                        } else {
                            velMatch = potentialLink;
                        }
                    }

                    const linkedZone =
                        perfectMatch ?? bothMatch ?? keyMatch ?? velMatch;
                    ordered.push(linkedZone);
                    added.add(linkedZone);
                }
            }
        }

        ordered.push(z);
        added.add(z);
    });
    return ordered;
}
