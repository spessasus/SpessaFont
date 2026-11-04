import { describe, expect, it } from "vitest";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { getClickResult, getSelection } from "./menu_selection.ts";
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
