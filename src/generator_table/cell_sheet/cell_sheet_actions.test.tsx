// @vitest-environment jsdom
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
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
