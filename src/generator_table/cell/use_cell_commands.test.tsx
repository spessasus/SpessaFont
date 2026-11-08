// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { GeneratorTypes } from "spessasynth_core";
import {
    createTestSession,
    publishSetUp
} from "../../test_utils/bank_fixture.ts";
import { BankEditorContext } from "../../bank_editor/bank_editor_context.ts";
import { ClipboardContext } from "../../clipboard/clipboard_context.ts";
import { ClipboardManager } from "../../core_backend/clipboard_manager.ts";
import { getObjectId } from "../../utils/object_id.ts";
import { INSTRUMENT_ROWS } from "../../instrument_editor/instrument_rows.ts";
import { getZoneColumns } from "../zone_columns.ts";
import { useCellCommands } from "./use_cell_commands.ts";

function setUp(clipboardText = "") {
    const session = createTestSession();
    const [instrument] = session.document.instruments;
    const [sample] = session.document.samples;
    while (instrument.zones.length > 0) {
        instrument.deleteZone(0);
    }
    const first = instrument.createZone(sample);
    first.keyRange = { min: 60, max: 62 };
    first.setGenerator(GeneratorTypes.initialAttenuation, 150);
    const second = instrument.createZone(sample);
    second.keyRange = { min: 63, max: 70 };
    second.setGenerator(GeneratorTypes.initialAttenuation, 200);
    publishSetUp(session);
    const { views } = session.store.getSnapshot();
    const view = views.instruments.get(getObjectId(instrument));
    if (!view) {
        throw new Error("The instrument has no view.");
    }
    const columns = getZoneColumns(view.zones, {
        kind: "samples",
        views: views.samples
    });
    const row = INSTRUMENT_ROWS.find(
        (r) => r.generator === GeneratorTypes.initialAttenuation
    );
    if (!row) {
        throw new Error("No attenuation row.");
    }
    const clipboard = new ClipboardManager();
    const writeText = vi.fn(() => Promise.resolve());
    const readText = vi.fn(() => Promise.resolve(clipboardText));
    vi.stubGlobal("navigator", { clipboard: { writeText, readText } });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <BankEditorContext.Provider
            value={{
                session,
                apply: (actions, key) => session.history.do(actions, key),
                setView: () => undefined,
                playSample: () => undefined
            }}
        >
            <ClipboardContext.Provider value={clipboard}>
                {children}
            </ClipboardContext.Provider>
        </BankEditorContext.Provider>
    );
    const { result } = renderHook(
        () => useCellCommands(instrument, row, columns, columns),
        { wrapper }
    );
    return { instrument, columns, clipboard, writeText, result };
}

describe("useCellCommands", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("copies the selected cells to both clipboards", () => {
        const { columns, clipboard, writeText, result } = setUp();
        act(() => {
            result.current.copyCells(columns[0]);
        });
        expect(writeText).toHaveBeenCalledWith("6.00\t8.00");
        expect(clipboard.cells?.values).toEqual([150, 200]);
    });

    it("pastes the system text into every selected cell", async () => {
        const { instrument, columns, result } = setUp("4");
        await act(async () => {
            result.current.pasteCells(columns[0]);
            await Promise.resolve();
        });
        expect(
            instrument.zones.map((z) =>
                z.getGenerator(GeneratorTypes.initialAttenuation, null)
            )
        ).toEqual([100, 100]);
    });

    it("keeps the desktop menu entries on the same code", () => {
        const { columns, writeText, result } = setUp();
        const entries = result.current.getMenuEntries(columns[0]);
        expect(entries.map((e) => (e === "separator" ? e : e.label))).toEqual([
            "contextMenu.copy",
            "contextMenu.cut",
            "contextMenu.paste",
            "toolsLocale.cells.clear"
        ]);
        const [copyEntry] = entries;
        if (copyEntry === "separator") {
            throw new Error("Expected an entry.");
        }
        act(() => {
            copyEntry.onSelect();
        });
        expect(writeText).toHaveBeenCalledWith("6.00\t8.00");
    });
});
