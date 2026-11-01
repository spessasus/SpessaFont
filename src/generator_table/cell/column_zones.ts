import type { BasicZone } from "spessasynth_core";
import type { ZoneColumn } from "../zone_columns.ts";

/**
 * The zones an edit to the column applies to: the zone and its stereo partner.
 */
export function getColumnZones({ zone, linkedZone }: ZoneColumn) {
    const zones: BasicZone[] = [zone];
    if (linkedZone) {
        zones.push(linkedZone);
    }
    return zones;
}
