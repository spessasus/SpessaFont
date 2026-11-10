import { describe, expect, it } from "vitest";
import type { ZoneView } from "../../core_backend/entity_views.ts";
import type { ZoneColumn } from "../zone_columns.ts";
import { findColumnsInSpan } from "./cell_sheet_keys.ts";

function createZone(
    id: number,
    keyRange?: { min: number; max: number },
    velocityRange?: { min: number; max: number }
): ZoneView {
    return {
        id,
        keyRange,
        velocityRange,
        generators: [],
        modulators: [],
        childId: id
    };
}

function createColumn(zone: ZoneView): ZoneColumn {
    return {
        zone,
        linkedZone: undefined,
        colSpan: 1,
        isStereo: false,
        name: `Zone ${zone.id}`,
        sample: undefined,
        linkedSample: undefined
    };
}

// Zones like 12-str.Gt's, plus one without a key range
const LOW = createColumn(createZone(1, { min: 0, max: 47 }));
const MID = createColumn(createZone(2, { min: 48, max: 69 }));
const HIGH = createColumn(createZone(3, { min: 70, max: 86 }));
const RANGELESS = createColumn(createZone(4));
const COLUMNS = [LOW, MID, HIGH, RANGELESS];
const GLOBAL = createZone(0, { min: 0, max: 127 });

const ids = (columns: readonly ZoneColumn[]) => columns.map((c) => c.zone.id);

describe("findColumnsInSpan", () => {
    it("finds the zones overlapping a span", () => {
        expect(
            ids(findColumnsInSpan([LOW, MID, HIGH], GLOBAL, 48, 70))
        ).toEqual([2, 3]);
    });

    it("takes the span in either order", () => {
        expect(
            ids(findColumnsInSpan([LOW, MID, HIGH], GLOBAL, 70, 48))
        ).toEqual([2, 3]);
    });

    it("uses Global's key range for zones without one", () => {
        const global = createZone(0, { min: 60, max: 64 });
        expect(ids(findColumnsInSpan(COLUMNS, global, 62, 62))).toContain(4);
        expect(ids(findColumnsInSpan(COLUMNS, global, 10, 20))).not.toContain(
            4
        );
    });

    it("never checks Global", () => {
        const globalColumn = createColumn(GLOBAL);
        const found = findColumnsInSpan(
            [globalColumn, ...COLUMNS],
            GLOBAL,
            0,
            127
        );
        expect(ids(found)).toEqual([1, 2, 3, 4]);
    });

    it("finds the velocity layers of one key", () => {
        const soft = createColumn(
            createZone(5, { min: 38, max: 38 }, { min: 0, max: 63 })
        );
        const loud = createColumn(
            createZone(6, { min: 38, max: 38 }, { min: 64, max: 127 })
        );
        expect(
            ids(findColumnsInSpan([soft, loud, HIGH], GLOBAL, 38, 38))
        ).toEqual([5, 6]);
    });
});
