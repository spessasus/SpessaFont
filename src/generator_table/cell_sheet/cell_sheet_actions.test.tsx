// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
    act,
    cleanup,
    fireEvent,
    render,
    renderHook,
    screen
} from "@testing-library/react";
import {
    type BasicInstrument,
    EmptySample,
    GeneratorTypes,
    SampleTypes
} from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip,
    publishSetUp
} from "../../test_utils/bank_fixture.ts";
import type { BankSession } from "../../core_backend/bank_session.ts";
import { BankEditorContext } from "../../bank_editor/bank_editor_context.ts";
import { ClipboardContext } from "../../clipboard/clipboard_context.ts";
import { ClipboardManager } from "../../core_backend/clipboard_manager.ts";
import { getObjectId } from "../../utils/object_id.ts";
import { INSTRUMENT_ROWS } from "../../instrument_editor/instrument_rows.ts";
import type { CellContext } from "../cell/cell_values.ts";
import { useCellCommands } from "../cell/use_cell_commands.ts";
import { getZoneColumns } from "../zone_columns.ts";
import { applyCellSheetText, buildCellText } from "./cell_sheet_text.ts";
import { snapshotBank } from "../../test_utils/bank_fixture.ts";
import { formatNumberCell } from "../cell/cell_values.ts";
import { CellSheetNumberEditor } from "./cell_sheet_number_editor.tsx";
import { createSliderActions, getSliderRange } from "./slider_range.ts";

const ATTENUATION = INSTRUMENT_ROWS.find(
    (r) => r.generator === GeneratorTypes.initialAttenuation
);

function getColumns(session: BankSession, instrument: BasicInstrument) {
    const { views } = session.store.getSnapshot();
    const view = views.instruments.get(getObjectId(instrument));
    if (!view) {
        throw new Error("The instrument has no view.");
    }
    return getZoneColumns(view.zones, {
        kind: "samples",
        views: views.samples
    });
}

/**
 * An instrument with two mono zones that store attenuation 150 and 200.
 */
function setUpTwoZones() {
    if (!ATTENUATION) {
        throw new Error("No attenuation row.");
    }
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
    const context: CellContext = {
        element: instrument,
        row: ATTENUATION,
        isInstrument: true
    };
    return {
        session,
        instrument,
        context,
        columns: getColumns(session, instrument)
    };
}

function readAttenuations(instrument: BasicInstrument) {
    return instrument.zones.map((z) =>
        z.getGenerator(GeneratorTypes.initialAttenuation, null)
    );
}

describe("the cell sheet's edits", () => {
    it("lowers two columns by 2 dB with Add -2", () => {
        const { session, instrument, context, columns } = setUpTwoZones();
        const [columnA, columnB] = columns;
        expectRoundTrip(
            session,
            applyCellSheetText(
                context,
                [columnA, columnB],
                buildCellText("add", "-2", false) ?? ""
            ) ?? []
        );
        expect(readAttenuations(instrument)).toEqual([100, 150]);
    });

    it("makes ten + taps within the merge window one undo step", () => {
        const { session, instrument, context, columns } = setUpTwoZones();
        const wrapper = ({ children }: { children: ReactNode }) => (
            <BankEditorContext.Provider
                value={{
                    session,
                    apply: (actions, key) => session.history.do(actions, key),
                    setView: () => undefined,
                    playSample: () => undefined
                }}
            >
                <ClipboardContext.Provider value={new ClipboardManager()}>
                    {children}
                </ClipboardContext.Provider>
            </BankEditorContext.Provider>
        );
        const { result } = renderHook(
            () =>
                useCellCommands(
                    instrument,
                    context.row,
                    columns,
                    columns.slice(0, 1)
                ),
            { wrapper }
        );
        const [columnA] = columns;
        for (let i = 0; i < 10; i++) {
            act(() => {
                result.current.getInputCommands(columnA).nudge(1, 1);
            });
        }
        // One visible step of 0.04 dB per tap
        expect(readAttenuations(instrument)).toEqual([160, 200]);
        session.history.undo();
        expect(readAttenuations(instrument)).toEqual([150, 200]);
        expect(session.history.canUndo).toBe(false);
    });

    it("edits both halves of a stereo pair column", () => {
        if (!ATTENUATION) {
            throw new Error("No attenuation row.");
        }
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const [left, right] = session.document.samples;
        const mono = new EmptySample();
        mono.name = "Bell";
        mono.setAudioData(new Float32Array(1000).fill(0.25), 44_100);
        session.document.addSample(mono);
        left.setLinkedSample(right, SampleTypes.leftSample);
        while (instrument.zones.length > 0) {
            instrument.deleteZone(0);
        }
        instrument.createZone(left);
        instrument.createZone(right);
        const bell = instrument.createZone(mono);
        bell.setGenerator(GeneratorTypes.initialAttenuation, 40);
        publishSetUp(session);
        const columns = getColumns(session, instrument);
        const [pair, bellColumn] = columns;
        expect(pair.isStereo).toBe(true);
        expect(bellColumn.zone.id).toBe(getObjectId(bell));
        const context: CellContext = {
            element: instrument,
            row: ATTENUATION,
            isInstrument: true
        };

        expectRoundTrip(
            session,
            applyCellSheetText(
                context,
                [pair],
                buildCellText("set", "6", false) ?? ""
            ) ?? []
        );
        // 6 dB is 150 in the bank's 0.04 dB steps
        expect(readAttenuations(instrument)).toEqual([150, 150, 40]);
    });

    it("sends nothing for a lone minus from the sign button", () => {
        expect(buildCellText("set", "-", false)).toBeUndefined();
        expect(buildCellText("add", "-", false)).toBeUndefined();
        expect(buildCellText("multiply", " - ", false)).toBeUndefined();
        expect(buildCellText("set", "-", true)).toBeUndefined();
    });
});

/**
 * The number editor with its slider over the given columns, committing like the sheet does.
 */
function renderSlider(
    session: BankSession,
    context: CellContext,
    columns: ReturnType<typeof getColumns>,
    value: number | null
) {
    const range = getSliderRange(context.row, true);
    if (!range) {
        throw new Error("The row has no slider.");
    }
    return render(
        <CellSheetNumberEditor
            unitSuffix={undefined}
            isDisabled={false}
            status={""}
            footer={null}
            onApply={() => true}
            onNudge={() => undefined}
            slider={{ row: context.row, range, value }}
            onSliderCommit={(raw) =>
                session.history.do(createSliderActions(context, columns, raw))
            }
        />
    );
}

function getSlider() {
    return screen.getByRole<HTMLInputElement>("slider");
}

function drag(values: number[], end: "pointerUp" | "pointerCancel" | null) {
    const slider = getSlider();
    fireEvent.pointerDown(slider, { pointerId: 1 });
    for (const value of values) {
        fireEvent.change(slider, { target: { value: String(value) } });
    }
    if (end) {
        fireEvent[end](slider, { pointerId: 1 });
    }
}

describe("the cell sheet's slider", () => {
    afterEach(cleanup);

    it("shows the dragged value without committing", () => {
        const { session, context, columns } = setUpTwoZones();
        renderSlider(session, context, columns, 150);
        drag([100, 110, 120], null);
        expect(session.history.canUndo).toBe(false);
        expect(document.body.textContent).toContain(
            formatNumberCell(context.row, 120)
        );
        // Nothing is typed, so the status line's "sends" part is the slider's
        expect(document.querySelector(".cell_sheet_sends")).not.toBeNull();
    });

    it("makes one drag one undo step that equals a Set", () => {
        const typed = setUpTwoZones();
        const text = buildCellText(
            "set",
            formatNumberCell(typed.context.row, 120),
            false
        );
        typed.session.history.do(
            applyCellSheetText(typed.context, typed.columns, text ?? "") ?? []
        );
        const { session, instrument, context, columns } = setUpTwoZones();
        const before = snapshotBank(session.document.bank);
        renderSlider(session, context, columns, 150);
        drag([100, 110, 120], "pointerUp");
        expect(readAttenuations(instrument)).toEqual([120, 120]);
        expect(snapshotBank(session.document.bank)).toEqual(
            snapshotBank(typed.session.document.bank)
        );
        act(() => {
            session.history.undo();
        });
        expect(snapshotBank(session.document.bank)).toEqual(before);
        expect(session.history.canUndo).toBe(false);
    });

    it("shows the draft in the row's units", () => {
        const { session, context, columns } = setUpTwoZones();
        const attack = INSTRUMENT_ROWS.find(
            (r) => r.generator === GeneratorTypes.attackVolEnv
        );
        if (!attack) {
            throw new Error("No attack row.");
        }
        renderSlider(session, { ...context, row: attack }, columns, null);
        drag([-1200], null);
        expect(document.body.textContent).toContain(
            formatNumberCell(attack, -1200)
        );
    });

    it("commits nothing when the drag is canceled", () => {
        const { session, instrument, context, columns } = setUpTwoZones();
        renderSlider(session, context, columns, 150);
        drag([100, 120], "pointerCancel");
        fireEvent.pointerUp(getSlider(), { pointerId: 1 });
        expect(readAttenuations(instrument)).toEqual([150, 200]);
        expect(session.history.canUndo).toBe(false);
    });

    it("commits nothing when the sheet closes during the drag", () => {
        const { session, instrument, context, columns } = setUpTwoZones();
        const { unmount } = renderSlider(session, context, columns, 150);
        drag([100, 120], null);
        unmount();
        expect(readAttenuations(instrument)).toEqual([150, 200]);
        expect(session.history.canUndo).toBe(false);
    });

    it("commits nothing for a tap that moved nothing", () => {
        const { session, context, columns } = setUpTwoZones();
        renderSlider(session, context, columns, 150);
        drag([], "pointerUp");
        expect(session.history.canUndo).toBe(false);
    });

    it("shows no slider for a row without a range", () => {
        render(
            <CellSheetNumberEditor
                unitSuffix={undefined}
                isDisabled={false}
                status={""}
                footer={null}
                onApply={() => true}
                onNudge={() => undefined}
                slider={undefined}
                onSliderCommit={() => undefined}
            />
        );
        expect(screen.queryByRole("slider")).toBeNull();
    });
});
