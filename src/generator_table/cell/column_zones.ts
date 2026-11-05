import type { BasicInstrument, BasicPreset, BasicZone } from "spessasynth_core";
import { getObjectId } from "../../utils/object_id.ts";
import type { SampleView } from "../../core_backend/entity_views.ts";
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
 * A zone of a column, with the view of its sample (for the offset limits and the root key).
 */
export interface ColumnZone {
    zone: BasicZone;
    sample: SampleView | undefined;
}

/**
 * The zones an edit to the column applies to: the zone and its stereo partner. For handlers,
 * as it reads the element.
 */
export function getColumnZones(
    element: BasicPreset | BasicInstrument,
    { zone, linkedZone, sample, linkedSample }: ZoneColumn
) {
    const zones = new Array<ColumnZone>();
    for (const [view, zoneSample] of [
        [zone, sample],
        [linkedZone, linkedSample]
    ] as const) {
        const found = view ? findZone(element, view.id) : undefined;
        if (found) {
            zones.push({ zone: found, sample: zoneSample });
        }
    }
    return zones;
}
