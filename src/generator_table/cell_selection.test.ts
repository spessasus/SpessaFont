// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { type GeneratorType, GeneratorTypes } from "spessasynth_core";
import {
    type CellSelection,
    getCellSelection,
    getTapModifiers,
    PHONE_TAP_MODIFIERS,
    shouldClearCellSelection
} from "./cell_selection.ts";
import type { ZoneColumn } from "./zone_columns.ts";

const NONE = { ctrlKey: false, metaKey: false, shiftKey: false };
const CTRL = { ctrlKey: true, metaKey: false, shiftKey: false };

function column(id: number) {
    // Only the zone id is read by the selection
    return { zone: { id } } as ZoneColumn;
}

const COLUMNS = [column(1), column(2), column(3)];
const ATT = GeneratorTypes.initialAttenuation;
const PAN = GeneratorTypes.pan;

function tap(
    previous: CellSelection | null,
    generator: GeneratorType,
    zoneId: number
) {
    return getCellSelection(
        previous,
        generator,
        COLUMNS,
        zoneId,
        getTapModifiers("phone", NONE)
    );
}

describe("cell selection", () => {
    it("selects nothing on a plain desktop click and toggles with Ctrl as today", () => {
        expect(
            getCellSelection(
                null,
                ATT,
                COLUMNS,
                1,
                getTapModifiers("desktop", NONE)
            )
        ).toBeNull();
        const selected = getCellSelection(
            null,
            ATT,
            COLUMNS,
            1,
            getTapModifiers("desktop", CTRL)
        );
        expect([...(selected?.zoneIds ?? [])]).toEqual([1]);
    });

    it("starts, toggles and moves the selection with phone taps", () => {
        expect(getTapModifiers("phone", NONE)).toBe(PHONE_TAP_MODIFIERS);
        const a = tap(null, ATT, 1);
        expect([...(a?.zoneIds ?? [])]).toEqual([1]);
        const b = tap(a, ATT, 2);
        expect([...(b?.zoneIds ?? [])]).toEqual([1, 2]);
        const moved = tap(b, PAN, 2);
        expect(moved).toEqual({
            generator: PAN,
            zoneIds: new Set([2]),
            anchorId: 2
        });
        const first = tap(null, ATT, 1);
        const cleared = tap(first, ATT, 1);
        expect(cleared).not.toBeNull();
        expect(cleared?.zoneIds.size).toBe(0);
    });
});

function build() {
    document.body.innerHTML = `<div><div class="grid_view_bar"><button id="bar"></button></div>
        <table><thead><tr><th id="head"></th></tr></thead>
        <tbody><tr><th id="rowhead"></th><td class="generator_cell"><input id="cell"></td></tr></tbody></table></div>`;
    return (id: string) => document.querySelector(`#${id}`);
}

describe("shouldClearCellSelection", () => {
    it("keeps the selection for cells, the header, the bar and the body", () => {
        const get = build();
        expect(shouldClearCellSelection(get("cell"))).toBe(false);
        expect(shouldClearCellSelection(get("head"))).toBe(false);
        expect(shouldClearCellSelection(get("bar"))).toBe(false);
        expect(shouldClearCellSelection(document.querySelector("tbody"))).toBe(
            false
        );
    });

    it("clears on a row header", () => {
        const get = build();
        expect(shouldClearCellSelection(get("rowhead"))).toBe(true);
    });
});
