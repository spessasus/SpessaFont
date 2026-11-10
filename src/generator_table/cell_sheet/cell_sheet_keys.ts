import type { ZoneView } from "../../core_backend/entity_views.ts";
import type { ZoneColumn } from "../zone_columns.ts";
import { getColumnKeyRange } from "../zone_finder.ts";

/**
 * The zone columns whose key range overlaps a span of keys, with Global's range for zones
 * without one. The Global column itself is never found. The span may come in either order.
 */
export function findColumnsInSpan(
    columns: readonly ZoneColumn[],
    globalZone: ZoneView,
    low: number,
    high: number
) {
    const from = Math.min(low, high);
    const to = Math.max(low, high);
    return columns.filter((column) => {
        if (column.zone.id === globalZone.id) {
            return false;
        }
        const { min, max } = getColumnKeyRange(column, globalZone);
        return min <= to && max >= from;
    });
}
