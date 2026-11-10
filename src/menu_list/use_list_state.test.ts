// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { BasicInstrument, BasicSample, SampleTypes } from "spessasynth_core";
import { useSectionsOpen } from "./use_list_state.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";

const sample = new BasicSample(
    "s",
    44_100,
    60,
    0,
    SampleTypes.monoSample,
    0,
    0
);
const instrument = new BasicInstrument();

function render(isAccordion: boolean) {
    return renderHook(
        ({ view }: { view: BankEditView }) =>
            useSectionsOpen(view, isAccordion),
        { initialProps: { view: sample as BankEditView } }
    );
}

describe("useSectionsOpen", () => {
    it("keeps independent sections on desktop", () => {
        const { result } = render(false);
        expect(result.current.isOpen("samples")).toBe(true);
        expect(result.current.isOpen("presets")).toBe(false);
        act(() => {
            result.current.toggle("presets");
        });
        expect(result.current.isOpen("samples")).toBe(true);
        expect(result.current.isOpen("presets")).toBe(true);
    });

    it("opens a desktop section when the view becomes its kind", () => {
        const { result, rerender } = render(false);
        rerender({ view: instrument });
        expect(result.current.isOpen("samples")).toBe(true);
        expect(result.current.isOpen("instruments")).toBe(true);
    });

    it("opens one section at a time as an accordion", () => {
        const { result, rerender } = render(true);
        expect(result.current.isOpen("samples")).toBe(true);
        act(() => {
            result.current.toggle("presets");
        });
        expect(result.current.isOpen("samples")).toBe(false);
        expect(result.current.isOpen("presets")).toBe(true);
        rerender({ view: instrument });
        expect(result.current.isOpen("presets")).toBe(false);
        expect(result.current.isOpen("instruments")).toBe(true);
    });

    it("lets an accordion close its open section", () => {
        const { result } = render(true);
        act(() => {
            result.current.setOpen("samples", false);
        });
        expect(result.current.isOpen("samples")).toBe(false);
    });

    it("keeps earlier changes when setOpen runs from a stale render", () => {
        const { result } = render(false);
        const stale = result.current;
        act(() => {
            result.current.setOpen("presets", true);
        });
        act(() => {
            stale.setOpen("instruments", true);
        });
        expect(result.current.isOpen("samples")).toBe(true);
        expect(result.current.isOpen("presets")).toBe(true);
        expect(result.current.isOpen("instruments")).toBe(true);
    });
});
