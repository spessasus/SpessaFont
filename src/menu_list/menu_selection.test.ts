import { describe, expect, it } from "vitest";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import {
    getClickResult,
    getListKeyResult,
    getSelection
} from "./menu_selection.ts";
import { filterElements } from "./filter_elements.ts";

const NONE = { shiftKey: false, ctrlKey: false };
const IS_LISTED = () => true;

describe("menu selection", () => {
    it("selects the shown element unless a multi selection was made for it", () => {
        const [a, b] = createTestSession().document.presets;

        expect([...getSelection("info", null, IS_LISTED)]).toEqual([]);
        expect([...getSelection(a, null, IS_LISTED)]).toEqual([a]);
        expect([
            ...getSelection(a, { anchor: a, items: new Set([a, b]) }, IS_LISTED)
        ]).toEqual([a, b]);
        // A multi selection made while another element was shown no longer applies
        expect([
            ...getSelection(b, { anchor: a, items: new Set([a, b]) }, IS_LISTED)
        ]).toEqual([b]);
    });

    it("leaves out selected elements the list no longer shows", () => {
        const session = createTestSession();
        const [a, b] = session.document.samples;
        const multi = { anchor: a, items: new Set([a, b]) };
        session.document.removeSample(b);

        const selection = getSelection(a, multi, (e) =>
            session.document.contains(e)
        );

        expect([...selection]).toEqual([a]);
    });

    it("falls back to the shown element when nothing selected is listed", () => {
        const [a, b] = createTestSession().document.samples;
        const selection = getSelection(
            a,
            { anchor: a, items: new Set([a, b]) },
            () => false
        );
        expect([...selection]).toEqual([a]);
    });

    it("shows the clicked element without modifiers", () => {
        const [a, b] = createTestSession().document.samples;

        expect(getClickResult([a, b], b, a, new Set([a]), NONE)).toEqual({
            type: "show",
            entity: b
        });
    });

    it("selects a range with Shift and toggles with Ctrl", () => {
        const session = createTestSession();
        const [a, b] = session.document.samples;
        const items = [a, b];

        const range = getClickResult(items, b, a, new Set([a]), {
            shiftKey: true,
            ctrlKey: false
        });
        expect(range.type === "select" && [...range.selection.items]).toEqual([
            a,
            b
        ]);

        const toggled = getClickResult(items, a, a, new Set([a, b]), {
            shiftKey: false,
            ctrlKey: true
        });
        expect(
            toggled.type === "select" && [...toggled.selection.items]
        ).toEqual([b]);
    });

    it("shows the clicked element when the shown element is not in the list", () => {
        const session = createTestSession();
        const [a, b] = session.document.samples;
        const preset = session.document.presets[0];

        expect(
            getClickResult([a, b], b, preset, new Set(), {
                shiftKey: true,
                ctrlKey: false
            }).type
        ).toBe("show");
    });
});

function names<T extends { name: string }>(
    ids: readonly number[],
    map: ReadonlyMap<number, T>
) {
    return ids.map((id) => map.get(id)?.name);
}

describe("filterElements", () => {
    it("keeps the views' orders for an empty query", () => {
        const { views } = createTestSession().store.getSnapshot();

        const result = filterElements(views, "");

        expect(result.presets).toBe(views.presetOrder);
        expect(result.samples).toBe(views.sampleOrder);
    });

    it("keeps what a matching preset uses, in bank order", () => {
        const { views } = createTestSession().store.getSnapshot();
        const result = filterElements(views, "WAVE 2");

        expect(names(result.presets, views.presets)).toEqual(["Saw Wave 2"]);
        expect(names(result.instruments, views.instruments)).toEqual([
            "Saw Wave 2"
        ]);
        expect(names(result.samples, views.samples)).toEqual(["Saw 2"]);
    });
});

describe("menu selection on macOS", () => {
    it("toggles with Cmd+click", () => {
        const [a, b] = createTestSession().document.samples;
        const result = getClickResult([a, b], b, a, new Set([a]), {
            ...NONE,
            metaKey: true
        });
        expect(result.type).toBe("select");
        expect(
            result.type === "select" ? [...result.selection.items] : []
        ).toEqual([a, b]);
    });
});

function twoSamples() {
    const session = createTestSession();
    const [a, b] = session.document.samples;
    return { a, b, session };
}

describe("list keys", () => {
    const SHIFT = { ...NONE, shiftKey: true };
    const CTRL = { ...NONE, ctrlKey: true };

    it("shows the next element, and the ends with Home and End", () => {
        const { a, b } = twoSamples();
        const items = [a, b];
        expect(getListKeyResult(items, a, null, "ArrowDown", NONE)).toEqual({
            type: "show",
            entity: b
        });
        expect(getListKeyResult(items, b, null, "Home", NONE)).toEqual({
            type: "show",
            entity: a
        });
        expect(getListKeyResult(items, a, null, "End", NONE)).toEqual({
            type: "show",
            entity: b
        });
        // Nothing past the end
        expect(getListKeyResult(items, b, null, "ArrowDown", NONE)).toBe(
            undefined
        );
        expect(getListKeyResult(items, a, null, "x", NONE)).toBe(undefined);
        expect(getListKeyResult(items, "info", null, "ArrowDown", NONE)).toBe(
            undefined
        );
    });

    it("extends a range with Shift and moves on from where it ended", () => {
        const { a, b } = twoSamples();
        const items = [a, b];
        const first = getListKeyResult(items, a, null, "ArrowDown", SHIFT);
        if (first?.type !== "select") throw new Error("Not a selection.");
        expect([...first.selection.items]).toEqual([a, b]);
        expect(first.selection.cursor).toBe(b);

        const back = getListKeyResult(
            items,
            a,
            first.selection,
            "ArrowUp",
            SHIFT
        );
        if (back?.type !== "select") throw new Error("Not a selection.");
        expect([...back.selection.items]).toEqual([a]);
    });

    it("moves the cursor with Ctrl and toggles with Ctrl+Space", () => {
        const { a, b } = twoSamples();
        const items = [a, b];
        const moved = getListKeyResult(items, a, null, "ArrowDown", CTRL);
        if (moved?.type !== "select") throw new Error("Not a selection.");
        expect([...moved.selection.items]).toEqual([a]);
        expect(moved.selection.cursor).toBe(b);

        const toggled = getListKeyResult(items, a, moved.selection, " ", CTRL);
        if (toggled?.type !== "select") throw new Error("Not a selection.");
        expect([...toggled.selection.items]).toEqual([a, b]);
    });

    it("selects the list with Ctrl+A and clears with Escape", () => {
        const { a, b } = twoSamples();
        const items = [a, b];
        const all = getListKeyResult(items, a, null, "a", CTRL);
        if (all?.type !== "select") throw new Error("Not a selection.");
        expect([...all.selection.items]).toEqual([a, b]);
        expect(
            getListKeyResult(items, a, all.selection, "Escape", NONE)
        ).toEqual({ type: "clear" });
        expect(getListKeyResult(items, a, null, "Escape", NONE)).toBe(
            undefined
        );
    });

    it("starts from an end of the list when the search hides the shown element", () => {
        const { a, b, session } = twoSamples();
        const [hidden] = session.document.instruments;
        expect(
            getListKeyResult([a, b], hidden, null, "ArrowDown", NONE)
        ).toEqual({
            type: "show",
            entity: a
        });
        expect(getListKeyResult([a, b], hidden, null, "ArrowUp", NONE)).toEqual(
            {
                type: "show",
                entity: b
            }
        );
    });
});
