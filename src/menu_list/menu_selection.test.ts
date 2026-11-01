import { describe, expect, it } from "vitest";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { getClickResult, getSelection } from "./menu_selection.ts";
import { filterElements } from "./filter_elements.ts";

const NONE = { shiftKey: false, ctrlKey: false };

describe("menu selection", () => {
    it("selects the shown element unless a multi selection was made for it", () => {
        const [a, b] = createTestSession().document.presets;

        expect([...getSelection("info", null)]).toEqual([]);
        expect([...getSelection(a, null)]).toEqual([a]);
        expect([
            ...getSelection(a, { anchor: a, items: new Set([a, b]) })
        ]).toEqual([a, b]);
        // A multi selection made while another element was shown no longer applies
        expect([
            ...getSelection(b, { anchor: a, items: new Set([a, b]) })
        ]).toEqual([b]);
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

describe("filterElements", () => {
    it("returns everything for an empty query", () => {
        const { document } = createTestSession();
        const elements = {
            presets: document.presets,
            instruments: document.instruments,
            samples: document.samples
        };

        expect(filterElements(elements, "")).toBe(elements);
    });

    it("keeps what a matching preset uses, in bank order", () => {
        const { document } = createTestSession();
        const result = filterElements(
            {
                presets: document.presets,
                instruments: document.instruments,
                samples: document.samples
            },
            "WAVE 2"
        );

        expect(result.presets.map((p) => p.name)).toEqual(["Saw Wave 2"]);
        expect(result.instruments.map((i) => i.name)).toEqual(["Saw Wave 2"]);
        expect(result.samples.map((s) => s.name)).toEqual(["Saw 2"]);
    });
});
