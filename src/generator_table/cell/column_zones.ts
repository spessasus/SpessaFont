import type { BasicInstrument, BasicPreset, BasicZone } from "spessasynth_core";
import { getObjectId } from "../../utils/object_id.ts";
import type { ZoneColumn } from "../zone_columns.ts";

/**
 * The element's zone with this view id, the global zone included.
 */
export function findZone(
    element: BasicPreset | BasicInstrument,
    zoneId: number
): BasicZone | undefined {
    return getObjectId(element.globalZone) === zoneId
        ? element.globalZone
        : element.zones.find((z) => getObjectId(z) === zoneId);
}

/**
 * The zones an edit to the column applies to: the zone and its stereo partner. For handlers,
 * as it reads the element.
 */
export function getColumnZones(
    element: BasicPreset | BasicInstrument,
    { zone, linkedZone }: ZoneColumn
) {
    const zones = new Array<BasicZone>();
    for (const view of [zone, linkedZone]) {
        const found = view ? findZone(element, view.id) : undefined;
        if (found) {
            zones.push(found);
        }
    }
    return zones;
}
