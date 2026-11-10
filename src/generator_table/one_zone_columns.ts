import type { ZoneColumn } from "./zone_columns.ts";

/**
 * Keeps a zone index inside the zone columns, 0 when there are none.
 */
export function clampZoneIndex(index: number, count: number) {
    return Math.max(0, Math.min(index, count - 1));
}

/**
 * The columns of the phone's One zone mode: Global and the zone column at `index`.
 * The split and modulator columns keep Global and whatever of them belongs to that zone, so a
 * stereo pair still shows both halves in the pan row.
 * @param zoneColumns the zone columns, without Global
 * @param splitColumns Global, then the zone columns with the pairs split
 * @param modulatorColumns Global, then the modulator row's zone columns
 * @param index the shown zone column, clamped when the zones changed under it
 */
export function getOneZoneColumns(
    zoneColumns: readonly ZoneColumn[],
    splitColumns: readonly ZoneColumn[],
    modulatorColumns: readonly ZoneColumn[],
    index: number
) {
    const clamped = clampZoneIndex(index, zoneColumns.length);
    const shown = zoneColumns.at(clamped);
    const shownIds = new Set(
        shown ? [shown.zone.id, shown.linkedZone?.id] : []
    );
    const keepShown = (columns: readonly ZoneColumn[]) => [
        columns[0],
        ...columns.slice(1).filter((c) => shownIds.has(c.zone.id))
    ];
    return {
        zoneColumns: shown ? [shown] : [],
        splitColumns: keepShown(splitColumns),
        modulatorColumns: keepShown(modulatorColumns),
        index: clamped
    };
}
