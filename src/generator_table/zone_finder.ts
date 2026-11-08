import type { GenericRange } from "spessasynth_core";
import type { ZoneView } from "../core_backend/entity_views.ts";
import { pickRange } from "../utils/zone_splits.ts";
import type { ZoneColumn } from "./zone_columns.ts";

const SEMITONES: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11
};
const MAX_KEY = 127;

/**
 * A key typed as a MIDI number or a note name (C4 is 60, "c#4" and "Db4" are 61), or undefined
 * for text that is neither or out of range.
 */
export function parseKeyText(text: string) {
    const trimmed = text.trim();
    if (/^\d{1,3}$/.test(trimmed)) {
        const key = Number(trimmed);
        return key <= MAX_KEY ? key : undefined;
    }
    const match = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(trimmed);
    if (!match) {
        return undefined;
    }
    const accidental = { "#": 1, b: -1, "": 0 }[match[2]] ?? 0;
    const key =
        (Number(match[3]) + 1) * 12 +
        SEMITONES[match[1].toUpperCase()] +
        accidental;
    return key >= 0 && key <= MAX_KEY ? key : undefined;
}

/**
 * The keys a column's zone plays, with the global zone's range when it has none.
 */
export function getColumnKeyRange(column: ZoneColumn, globalZone: ZoneView) {
    return pickRange(column.zone.keyRange, globalZone.keyRange);
}

export function formatKeyRange({ min, max }: GenericRange) {
    return `${min}-${max}`;
}

/**
 * Every column whose key range holds the key, so all velocity layers of a key are found.
 */
export function findColumnsForKey(
    columns: readonly ZoneColumn[],
    globalZone: ZoneView,
    key: number
) {
    return columns.filter((column) => {
        const { min, max } = getColumnKeyRange(column, globalZone);
        return min <= key && key <= max;
    });
}
