// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { GeneratorTypes } from "spessasynth_core";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { SetBankInfoAction } from "../info_view/set_bank_info_action.ts";
import { SetGeneratorAction } from "../generator_table/cell/set_generator_action.ts";
import { useBankSnapshot } from "./use_bank_snapshot.ts";
import { useHistoryState } from "./use_history_state.ts";
import { useSampleView } from "./use_sample_view.ts";
import { useInstrumentView } from "./use_instrument_view.ts";
import { getObjectId } from "../utils/object_id.ts";
import { EditSampleAction } from "../sample_editor/edit_sample_action.ts";

function countRenders<T>(hook: () => T) {
    const renders = { count: 0 };
    const result = renderHook(() => {
        renders.count++;
        return hook();
    });
    return { ...result, renders };
}

function editPan(session: ReturnType<typeof createTestSession>) {
    const instrument = session.document.instruments[0];
    act(() => {
        session.history.do([
            new SetGeneratorAction(
                instrument,
                instrument.zones[0],
                GeneratorTypes.pan,
                null,
                100
            )
        ]);
    });
}

describe("useBankSnapshot", () => {
    it("re-renders only when the selected field changes", () => {
        const session = createTestSession();
        const { result, renders } = countRenders(() =>
            useBankSnapshot(session.store, (s) => s.info)
        );
        const before = result.current;
        expect(before.name).toBe(session.document.bank.soundBankInfo.name);

        editPan(session);
        expect(renders.count).toBe(1);

        act(() => {
            session.history.do([
                new SetBankInfoAction("name", before.name, "Renamed")
            ]);
        });
        expect(renders.count).toBe(2);
        expect(result.current.name).toBe("Renamed");
    });
});

describe("useHistoryState", () => {
    it("follows undo, redo and the saved position", () => {
        const session = createTestSession();
        const { result } = renderHook(() => useHistoryState(session.store));
        expect(result.current).toMatchObject({
            canUndo: false,
            canRedo: false,
            isDirty: false
        });

        editPan(session);
        expect(result.current).toMatchObject({ canUndo: true, isDirty: true });

        act(() => {
            session.history.undo();
        });
        expect(result.current).toMatchObject({
            canUndo: false,
            canRedo: true,
            isDirty: false
        });

        act(() => {
            session.history.redo();
            session.history.markSaved();
        });
        expect(result.current).toMatchObject({ canUndo: true, isDirty: false });
    });
});

describe("element view hooks", () => {
    it("re-render a sample row only when that sample's view changes", () => {
        const session = createTestSession();
        const [sample, other] = session.document.samples;
        const { result, renders } = countRenders(() =>
            useSampleView(session.store, getObjectId(sample))
        );
        expect(result.current?.name).toBe(sample.name);

        editPan(session);
        act(() => {
            session.history.do([
                new EditSampleAction(other, "name", other.name, "Other")
            ]);
        });
        expect(renders.count).toBe(1);

        act(() => {
            session.history.do([
                new EditSampleAction(sample, "name", sample.name, "Renamed")
            ]);
        });
        expect(renders.count).toBe(2);
        expect(result.current?.name).toBe("Renamed");
    });

    it("re-render an instrument for its own edit, not a sample rename", () => {
        const session = createTestSession();
        const instrument = session.document.instruments[0];
        const { renders } = countRenders(() =>
            useInstrumentView(session.store, getObjectId(instrument))
        );
        const sample = instrument.zones[0].sample;

        act(() => {
            session.history.do([
                new EditSampleAction(sample, "name", sample.name, "Renamed")
            ]);
        });
        expect(renders.count).toBe(1);

        editPan(session);
        expect(renders.count).toBe(2);
    });
});
