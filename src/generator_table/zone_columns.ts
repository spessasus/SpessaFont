import {
    BasicInstrumentZone,
    type BasicPresetZone,
    type BasicZone
} from "spessasynth_core";
import { STEREO_REGEX } from "../utils/stereo_regex.ts";

/**
 * One column of the generator table. A stereo pair shares a column,
 * and edits to it are applied to both zones.
 */
export interface ZoneColumn<T extends BasicZone = BasicZone> {
    zone: T;
    /**
     * The stereo partner that receives the same edits, if any.
     */
    linkedZone: T | undefined;
    colSpan: number;
    isStereo: boolean;
    name: string;
}

/**
 * Pairs each zone with its stereo partner, if the partner is the zone right before or after it.
 */
function getLinkedZoneMap<
    ZoneType extends BasicPresetZone | BasicInstrumentZone
>(zones: readonly ZoneType[]) {
    const linkedZones = new Set<BasicZone>();
    /**
     * 0 - no link
     * 1 - first zone of the linked pair
     * 2 - second zone of the linked pair
     */
    type LinkPosition = 0 | 1 | 2;
    return zones.map((z, i): { index: LinkPosition; linkedZone?: ZoneType } => {
        let linkedZoneIndex = -1;
        if (z instanceof BasicInstrumentZone) {
            const linkedSample = z.sample.linkedSample;
            if (linkedSample) {
                linkedZoneIndex = zones.findIndex(
                    (z) =>
                        !linkedZones.has(z) &&
                        z instanceof BasicInstrumentZone &&
                        z.sample === linkedSample
                );
            }
        }
        if (linkedZoneIndex < 0) {
            return { index: 0 };
        }
        const linkedZone = zones[linkedZoneIndex];
        if (linkedZoneIndex === i + 1) {
            return { index: 1, linkedZone };
        }
        if (linkedZoneIndex === i - 1) {
            linkedZones.add(linkedZone);
            linkedZones.add(z);
            return { index: 2, linkedZone };
        }
        // A partner further away still gets the same edits, it just has its own column
        return { index: 0, linkedZone };
    });
}

function getZoneName(zone: BasicPresetZone | BasicInstrumentZone) {
    return zone instanceof BasicInstrumentZone
        ? zone.sample.name
        : zone.instrument.name;
}

/**
 * Lays out the zones as table columns.
 * With `shouldSplitPairs`, both zones of an adjacent stereo pair get their own column and are edited
 * separately (used for pan, which differs between the left and right sample).
 */
export function getZoneColumns(
    zones: readonly (BasicPresetZone | BasicInstrumentZone)[],
    shouldSplitPairs = false
) {
    const linkedZoneMap = getLinkedZoneMap(zones);
    const columns = new Array<
        ZoneColumn<BasicPresetZone | BasicInstrumentZone>
    >();
    for (const [i, zone] of zones.entries()) {
        const { index, linkedZone } = linkedZoneMap[i];
        const name = getZoneName(zone);
        if (index === 0 || shouldSplitPairs) {
            columns.push({
                zone,
                linkedZone: index === 0 ? linkedZone : undefined,
                colSpan: 1,
                isStereo: false,
                name
            });
            continue;
        }
        if (index === 2) {
            continue;
        }
        columns.push({
            zone,
            linkedZone,
            colSpan: 2,
            isStereo: true,
            name: name.replace(STEREO_REGEX, "").trim()
        });
    }
    return columns;
}
