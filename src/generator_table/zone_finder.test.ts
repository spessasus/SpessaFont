import { describe, expect, it } from "vitest";
import type { ZoneView } from "../core_backend/entity_views.ts";
import type { ZoneColumn } from "./zone_columns.ts";
import {
    findColumnsForKey,
    formatKeyRange,
    getColumnKeyRange,
    parseKeyText
} from "./zone_finder.ts";

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

describe("parseKeyText", () => {
    it("reads MIDI numbers and note names with C4 as 60", () => {
        expect(parseKeyText("38")).toBe(38);
        expect(parseKeyText(" 60 ")).toBe(60);
        expect(parseKeyText("D2")).toBe(38);
        expect(parseKeyText("C4")).toBe(60);
        expect(parseKeyText("c#4")).toBe(61);
        expect(parseKeyText("Db4")).toBe(61);
        expect(parseKeyText("C-1")).toBe(0);
        expect(parseKeyText("G9")).toBe(127);
        expect(parseKeyText("128")).toBeUndefined();
        expect(parseKeyText("H2")).toBeUndefined();
        expect(parseKeyText("")).toBeUndefined();
    });
});

describe("findColumnsForKey", () => {
    const global = createZone(0, { min: 60, max: 72 });
    const a = createColumn(createZone(1, { min: 0, max: 47 }));
    const b = createColumn(createZone(2, { min: 48, max: 69 }));
    const c = createColumn(createZone(3));

    it("finds zones by their range, the global range when they have none", () => {
        expect(findColumnsForKey([a, b, c], global, 38)).toEqual([a]);
        expect(findColumnsForKey([a, b, c], global, 65)).toEqual([b, c]);
        expect(findColumnsForKey([a, b, c], global, 100)).toEqual([]);
    });

    it("returns every velocity layer of a key", () => {
        const soft = createColumn(
            createZone(4, { min: 38, max: 38 }, { min: 0, max: 63 })
        );
        const loud = createColumn(
            createZone(5, { min: 38, max: 38 }, { min: 64, max: 127 })
        );
        expect(findColumnsForKey([soft, loud], createZone(0), 38)).toEqual([
            soft,
            loud
        ]);
    });
});

describe("getColumnKeyRange and formatKeyRange", () => {
    const global = createZone(0, { min: 60, max: 72 });
    const own = createColumn(createZone(1, { min: 1, max: 2 }));
    const inheriting = createColumn(createZone(2));

    it("picks the own range, else the global one, else every key", () => {
        expect(getColumnKeyRange(own, global)).toEqual({ min: 1, max: 2 });
        expect(getColumnKeyRange(inheriting, global)).toEqual({
            min: 60,
            max: 72
        });
        const noGlobal = createZone(0);
        expect(getColumnKeyRange(inheriting, noGlobal)).toEqual({
            min: 0,
            max: 127
        });
    });

    it("writes a range as min-max", () => {
        expect(formatKeyRange({ min: 48, max: 69 })).toBe("48-69");
    });
});
