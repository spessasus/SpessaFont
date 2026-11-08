import { describe, expect, it } from "vitest";
import {
    createTestHost,
    createTestSession
} from "../../test_utils/bank_fixture.ts";
import { getClickResult } from "../menu_selection.ts";
import {
    getBetweenResult,
    getSelectAllResult,
    getTapModifiers,
    SELECTION_TAP,
    startSelection
} from "./selection_mode.ts";

const NONE = { shiftKey: false, ctrlKey: false };

/**
 * Four samples a to d, from two sessions, since one has only two.
 */
function fourSamples() {
    const host = createTestHost();
    const first = createTestSession(host);
    const second = createTestSession(host);
    const [a, b] = first.document.samples;
    const [c, d] = second.document.samples;
    return { a, b, c, d, items: [a, b, c, d], session: first };
}

function selectedItems(result: ReturnType<typeof getClickResult>) {
    if (result.type !== "select") {
        throw new Error("Not a selection.");
    }
    return [...result.selection.items];
}

describe("selection mode", () => {
    it("starts with the long-pressed row", () => {
        const { a } = fourSamples();
        expect(startSelection(a)).toEqual({
            anchor: a,
            items: new Set([a]),
            cursor: a
        });
    });

    it("toggles with a tap", () => {
        const { a, c, items } = fourSamples();
        const added = getClickResult(items, c, a, new Set([a]), SELECTION_TAP);
        expect(selectedItems(added)).toEqual([a, c]);
        const removed = getClickResult(
            items,
            c,
            a,
            new Set([a, c]),
            SELECTION_TAP
        );
        expect(selectedItems(removed)).toEqual([a]);
    });

    it("replaces toggles with the range from the shown element", () => {
        const { a, b, c, d, items } = fourSamples();
        const result = getBetweenResult(items, c, a, new Set([a, d]));
        expect(selectedItems(result)).toEqual([a, b, c]);
    });

    it("shows an element of another kind", () => {
        const { a, session } = fourSamples();
        const [instrument] = session.document.instruments;
        expect(
            getClickResult(
                session.document.instruments,
                instrument,
                a,
                new Set(),
                SELECTION_TAP
            )
        ).toEqual({ type: "show", entity: instrument });
    });

    it("selects the whole list with All", () => {
        const { a, c, items } = fourSamples();
        const result = getSelectAllResult(items, a, startSelection(c));
        if (result?.type !== "select") {
            throw new Error("Not a selection.");
        }
        expect([...result.selection.items]).toEqual(items);
    });

    it("picks modifiers by layout and mode", () => {
        const shift = { shiftKey: true, ctrlKey: false };
        expect(getTapModifiers("desktop", "off", shift)).toBe(shift);
        expect(getTapModifiers("desktop", "selecting", shift)).toBe(shift);
        expect(getTapModifiers("phone", "off", shift)).toEqual(NONE);
        expect(getTapModifiers("phone", "selecting", NONE)).toBe(SELECTION_TAP);
    });
});
