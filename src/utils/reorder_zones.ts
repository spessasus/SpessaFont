import type { BasicInstrumentZone, BasicZone } from "spessasynth_core";

/**
 * Orders zones by their lowest key, and zones that start on the same key by their lowest velocity.
 */
export const ZONE_SORTING_FUNCTION = (z1: BasicZone, z2: BasicZone) =>
    z1.keyRange.min - z2.keyRange.min || z1.velRange.min - z2.velRange.min;

/**
 * Picks the linked zone that best matches the zone based on key and velocity range similarity.
 * There may be multiple stereo pairs in an instrument, so the sample alone is not enough.
 */
function findBestLinkedZone(
    zone: BasicInstrumentZone,
    links: BasicInstrumentZone[]
) {
    let velMatch = links[0];
    let keyMatch: BasicInstrumentZone | null = null;
    let bothMatch: BasicInstrumentZone | null = null;
    for (const potentialLink of links) {
        const hasMatchingKeys =
            potentialLink.keyRange.min === zone.keyRange.min &&
            potentialLink.keyRange.max === zone.keyRange.max;
        const hasMatchingVelocities =
            potentialLink.velRange.min === zone.velRange.min &&
            potentialLink.velRange.max === zone.velRange.max;
        if (hasMatchingKeys && hasMatchingVelocities) {
            if (
                potentialLink.modulators.length === zone.modulators.length &&
                potentialLink.generators.length === zone.generators.length
            ) {
                return potentialLink;
            }
            bothMatch = potentialLink;
        } else if (hasMatchingKeys) {
            keyMatch = potentialLink;
        } else {
            velMatch = potentialLink;
        }
    }
    return bothMatch ?? keyMatch ?? velMatch;
}

// reorders so the stereo sample pairs appear immediately after each other
export function reorderInstrumentZones(
    zones: BasicInstrumentZone[]
): BasicInstrumentZone[] {
    const ordered: BasicInstrumentZone[] = [];
    const added = new Set<BasicInstrumentZone>();
    zones = zones.slice().sort(ZONE_SORTING_FUNCTION);

    const addZone = (z: BasicInstrumentZone) => {
        if (added.has(z)) {
            return;
        }

        added.add(z);
        ordered.push(z);
    };

    for (const z of zones) {
        if (added.has(z)) {
            continue;
        }
        addZone(z);
        const link = z.sample.linkedSample;
        if (!link) {
            continue;
        }

        // get all zones linked to this sample
        const links = zones.filter(
            (lz) => lz.sample === link && !added.has(lz)
        );
        if (links.length > 0) {
            addZone(findBestLinkedZone(z, links));
        }
    }
    return ordered;
}
