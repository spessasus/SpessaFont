// @vitest-environment jsdom
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
    createTestSession,
    expectRoundTrip,
    publishSetUp
} from "../test_utils/bank_fixture.ts";
import type { BankSession } from "../core_backend/bank_session.ts";
import {
    BankEditorContext,
    type BankEditorContextType
} from "../bank_editor/bank_editor_context.ts";
import { type DialogsAPI, DialogsContext } from "../dialogs/dialogs_context.ts";
import { getObjectId } from "../utils/object_id.ts";
import type { BasicInstrument } from "spessasynth_core";
import { getZoneColumns } from "./zone_columns.ts";
import { useZoneCommands } from "./use_zone_commands.ts";

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

function setUp() {
    const session = createTestSession();
    const { document } = session;
    const [instrument] = document.instruments;
    const [sample] = document.samples;
    while (instrument.zones.length > 0) {
        instrument.deleteZone(0);
    }
    const first = instrument.createZone(sample);
    first.keyRange = { min: 60, max: 62 };
    const second = instrument.createZone(sample);
    second.keyRange = { min: 63, max: 70 };
    publishSetUp(session);
    const applied = new Array<Parameters<BankEditorContextType["apply"]>[0]>();
    const setView = vi.fn();
    const answers = { picked: undefined as unknown, dialogs: 0 };
    const dialogs: DialogsAPI = {
        // The test hands back the item the picker is meant to answer with
        pickElement: <T,>() => Promise.resolve(answers.picked as T | undefined),
        askNumber: () => Promise.resolve(undefined),
        openDialog: () => {
            answers.dialogs += 1;
            return Promise.resolve(undefined);
        }
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
        <BankEditorContext.Provider
            value={{
                session,
                apply: (actions) => {
                    // The test runs the group through expectRoundTrip
                    applied.push(actions);
                },
                setView,
                playSample: () => undefined
            }}
        >
            <DialogsContext.Provider value={dialogs}>
                {children}
            </DialogsContext.Provider>
        </BankEditorContext.Provider>
    );
    const { result } = renderHook(() => useZoneCommands(instrument), {
        wrapper
    });
    const [column] = getColumns(session, instrument);
    return {
        session,
        instrument,
        applied,
        setView,
        answers,
        result,
        column
    };
}

describe("useZoneCommands", () => {
    it("lists today's desktop menu in today's order", () => {
        const { result, column } = setUp();
        const entries = result.current.getMenuEntries(column);
        expect(entries.map((e) => (e === "separator" ? e : e.label))).toEqual([
            "contextMenu.open",
            "contextMenu.replaceSample",
            "contextMenu.duplicateZone",
            "separator",
            "toolsLocale.split.byKeyMenu",
            "toolsLocale.split.byVelocityMenu",
            "separator",
            "contextMenu.deleteZone"
        ]);
        const open = entries[0];
        const remove = entries[7];
        expect(open).toMatchObject({
            description: "phoneLocale.zoneHeader.openSample"
        });
        expect(remove).toMatchObject({ isDestructive: true });
    });

    it("duplicates, removes and splits by key in one undo step each", () => {
        const duplicated = setUp();
        act(() => duplicated.result.current.duplicate(duplicated.column));
        expectRoundTrip(duplicated.session, duplicated.applied.at(-1) ?? []);
        expect(duplicated.instrument.zones).toHaveLength(3);

        const removed = setUp();
        act(() => removed.result.current.remove(removed.column));
        expectRoundTrip(removed.session, removed.applied.at(-1) ?? []);
        expect(removed.instrument.zones).toHaveLength(1);

        const split = setUp();
        act(() => split.result.current.splitByKey(split.column));
        expectRoundTrip(split.session, split.applied.at(-1) ?? []);
        expect(split.instrument.zones).toHaveLength(4);
    });

    it("replaces the sample with the picked one", async () => {
        const { result, column, answers, session, instrument, applied } =
            setUp();
        const picked = session.document.samples[1];
        answers.picked = picked;
        await act(() => result.current.replace(column));
        expectRoundTrip(session, applied.at(-1) ?? []);
        expect(instrument.zones[0].sample).toBe(picked);
    });

    it("asks for the velocity split and opens the sample", () => {
        const { result, column, answers, setView, session } = setUp();
        act(() => result.current.splitByVelocity(column));
        expect(answers.dialogs).toBe(1);
        act(() => result.current.open(column));
        expect(setView).toHaveBeenCalledWith(session.document.samples[0]);
    });
});
