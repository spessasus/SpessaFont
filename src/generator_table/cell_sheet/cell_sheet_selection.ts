import type { GeneratorType } from "spessasynth_core";
import { getViewZones, type ZoneColumn } from "../zone_columns.ts";
import { readViewCell } from "../cell/cell_values.ts";

/**
 * Every zone column checked. The first column is Global, which stays unchecked.
 */
export function selectAllZones(columns: readonly ZoneColumn[]) {
    return new Set(columns.slice(1).map((column) => column.zone.id));
}

/**
 * Checks the zone columns between the first and last checked one. Global keeps its state.
 */
export function fillBetween(
    checked: ReadonlySet<number>,
    columns: readonly ZoneColumn[]
) {
    const zoneColumns = columns.slice(1);
    const first = zoneColumns.findIndex((c) => checked.has(c.zone.id));
    const last = zoneColumns.findLastIndex((c) => checked.has(c.zone.id));
    const result = new Set(checked);
    if (first === -1) {
        return result;
    }
    const between = zoneColumns.slice(first, last + 1);
    for (const column of between) {
        result.add(column.zone.id);
    }
    return result;
}

/**
 * Carries a selection to another row's columns, where stereo pairs may be split (pan) or
 * joined. A column is checked when its zone or its partner was.
 */
export function mapSelectionToRow(
    checked: ReadonlySet<number>,
    fromColumns: readonly ZoneColumn[],
    toColumns: readonly ZoneColumn[]
) {
    const zoneIds = new Set<number>();
    for (const column of fromColumns) {
        if (!checked.has(column.zone.id)) {
            continue;
        }
        zoneIds.add(column.zone.id);
        if (column.linkedZone) {
            zoneIds.add(column.linkedZone.id);
        }
    }
    return new Set(
        toColumns
            .filter(
                (column) =>
                    zoneIds.has(column.zone.id) ||
                    (column.linkedZone !== undefined &&
                        zoneIds.has(column.linkedZone.id))
            )
            .map((column) => column.zone.id)
    );
}

/**
 * The zone columns where a zone stores its own value for the generator, so an edit of Global
 * does not reach them. The first column is Global, which never counts.
 */
export function getColumnsIgnoringGlobal(
    columns: readonly ZoneColumn[],
    generator: GeneratorType
) {
    return columns
        .slice(1)
        .filter((column) =>
            getViewZones(column).some(
                (zone) => readViewCell(zone, generator) !== null
            )
        );
}
