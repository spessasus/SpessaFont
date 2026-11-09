// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import {
    type BasicInstrument,
    GeneratorTypes,
    SampleTypes
} from "spessasynth_core";
import { createTestSession, publishSetUp } from "../test_utils/bank_fixture.ts";
import type { BankSession } from "../core_backend/bank_session.ts";
import { BankEditorContext } from "../bank_editor/bank_editor_context.ts";
import { ClipboardContext } from "../clipboard/clipboard_context.ts";
import { ClipboardManager } from "../core_backend/clipboard_manager.ts";
import { ContextMenuContext } from "../context_menu/context_menu_context.ts";
import { LayoutContext } from "../layout/layout_context.ts";
import type { LayoutMode } from "../layout/layout_setting.ts";
import { useBankSnapshot } from "../hooks/use_bank_snapshot.ts";
import { getObjectId } from "../utils/object_id.ts";
import { LocaleList } from "../locale/locale_list.ts";
import { INSTRUMENT_ROWS } from "../instrument_editor/instrument_rows.ts";
import { createSetCellActions } from "./cell/cell_values.ts";
import { GeneratorRow } from "./generator_row.tsx";
import { getCellKey } from "./table_navigation.ts";
import { getZoneColumns } from "./zone_columns.ts";

// Each render of a cell's input counts under its grid key, so a test sees which cells rendered
const renders = vi.hoisted(() => new Map<string, number>());
const labels = vi.hoisted(() => new Map<string, string>());

vi.mock("./cell/generator_cell_input.tsx", () => ({
    GeneratorCellInput: ({
        label,
        gridKey,
        value
    }: {
        label: string;
        gridKey: string;
        value: string;
    }) => {
        renders.set(gridKey, (renders.get(gridKey) ?? 0) + 1);
        labels.set(gridKey, label);
        return <input aria-label={label} value={value} readOnly />;
    }
}));

function getRow(generator: number) {
    const row = INSTRUMENT_ROWS.find((r) => r.generator === generator);
    if (!row) {
        throw new Error(`No row for generator ${generator}.`);
    }
    return row;
}

const ROWS = [
    getRow(GeneratorTypes.initialAttenuation),
    getRow(GeneratorTypes.pan)
];

function getInstrumentView(session: BankSession, instrument: BasicInstrument) {
    const view = session.store
        .getSnapshot()
        .views.instruments.get(getObjectId(instrument));
    if (!view) {
        throw new Error("The instrument has no view.");
    }
    return view;
}

/**
 * The table's columns: the global zone, then the zones (a stereo pair shares one).
 */
function getColumns(session: BankSession, instrument: BasicInstrument) {
    const view = getInstrumentView(session, instrument);
    const children = {
        kind: "samples" as const,
        views: session.store.getSnapshot().views.samples
    };
    const [globalColumn] = getZoneColumns([view.globalZone], children);
    return [
        { ...globalColumn, name: "Global" },
        ...getZoneColumns(view.zones, children)
    ];
}

interface HarnessProps {
    session: BankSession;
    instrument: BasicInstrument;
    selectedZoneIds: ReadonlySet<number>;
    activeZoneId: number | undefined;
}

/**
 * Two generator rows of the instrument as the table renders them, read from the store.
 */
function Harness({
    session,
    instrument,
    selectedZoneIds,
    activeZoneId
}: HarnessProps) {
    const views = useBankSnapshot(session.store, (s) => s.views);
    const view = views.instruments.get(getObjectId(instrument));
    if (!view) {
        throw new Error("The instrument has no view.");
    }
    const children = { kind: "samples" as const, views: views.samples };
    const [globalColumn] = getZoneColumns([view.globalZone], children);
    const columns = [
        { ...globalColumn, name: "Global" },
        ...getZoneColumns(view.zones, children)
    ];
    return (
        <table>
            <tbody>
                {ROWS.map((row, i) => (
                    <GeneratorRow
                        key={row.generator}
                        element={instrument}
                        row={row}
                        columns={columns}
                        globalZone={view.globalZone}
                        selectedZoneIds={
                            i === 0 ? selectedZoneIds : new Set<number>()
                        }
                        activeKey={
                            activeZoneId === undefined
                                ? undefined
                                : getCellKey(row.generator, activeZoneId)
                        }
                        onSelectCell={() => undefined}
                        headerMenu={undefined}
                    />
                ))}
            </tbody>
        </table>
    );
}

async function setUp(layout: LayoutMode = "desktop", isStereo = false) {
    const i18n = i18next.createInstance();
    await i18n
        .use(initReactI18next)
        .init({ resources: LocaleList, lng: "en", fallbackLng: "en" });
    const session = createTestSession();
    const [instrument] = session.document.instruments;
    const [left, right] = session.document.samples;
    while (instrument.zones.length > 0) {
        instrument.deleteZone(0);
    }
    if (isStereo) {
        left.setLinkedSample(right, SampleTypes.leftSample);
    }
    for (let i = 0; i < 6; i++) {
        // With isStereo the last two zones are a stereo pair that shares a column
        const zone = instrument.createZone(isStereo && i === 5 ? right : left);
        zone.keyRange = { min: i * 10, max: i * 10 + 9 };
        // Zone 2 (index 1) inherits its attenuation from the global zone
        if (i !== 1) {
            zone.setGenerator(GeneratorTypes.initialAttenuation, i * 10);
        }
    }
    instrument.globalZone.setGenerator(GeneratorTypes.initialAttenuation, 40);
    publishSetUp(session);
    const clipboard = new ClipboardManager();
    const openMenu = vi.fn();
    const tree = (selected: ReadonlySet<number>, active?: number) => (
        <I18nextProvider i18n={i18n}>
            <LayoutContext.Provider value={layout}>
                <BankEditorContext.Provider
                    value={{
                        session,
                        apply: (actions, key) =>
                            session.history.do(actions, key),
                        setView: () => undefined,
                        playSample: () => undefined
                    }}
                >
                    <ClipboardContext.Provider value={clipboard}>
                        <ContextMenuContext.Provider value={{ openMenu }}>
                            <Harness
                                session={session}
                                instrument={instrument}
                                selectedZoneIds={selected}
                                activeZoneId={active}
                            />
                        </ContextMenuContext.Provider>
                    </ClipboardContext.Provider>
                </BankEditorContext.Provider>
            </LayoutContext.Provider>
        </I18nextProvider>
    );
    const { rerender } = render(tree(new Set()));
    const view = getInstrumentView(session, instrument);
    const zoneIds = view.zones.map((z) => z.id);
    /**
     * Sets the attenuation of the zone with this view id through the history, as a cell edit does.
     */
    const setAttenuation = (zoneId: number, value: number) => {
        const current = getInstrumentView(session, instrument);
        const zone = [current.globalZone, ...current.zones].find(
            (z) => z.id === zoneId
        );
        if (!zone) {
            throw new Error(`No zone ${zoneId}.`);
        }
        const actions = createSetCellActions(
            { element: instrument, row: ROWS[0], isInstrument: true },
            {
                zone,
                linkedZone: undefined,
                colSpan: 1,
                isStereo: false,
                name: "",
                sample: undefined,
                linkedSample: undefined
            },
            value
        );
        act(() => {
            session.history.do(actions);
        });
    };
    /**
     * The render count of each row's cells, in column order (Global first).
     */
    const counts = () => {
        const columns = getColumns(session, instrument);
        return ROWS.map((row) =>
            columns.map(
                (c) => renders.get(getCellKey(row.generator, c.zone.id)) ?? 0
            )
        );
    };
    const changesSince = (before: number[][]) =>
        counts().map((row, r) => row.map((c, i) => c - before[r][i]));
    return {
        i18n,
        globalId: view.globalZone.id,
        zoneIds,
        rerender,
        tree,
        setAttenuation,
        counts,
        changesSince
    };
}

/**
 * The cells that render again after zone 3's attenuation changed, in one layout.
 */
async function getEditChanges(layout: LayoutMode) {
    const { zoneIds, setAttenuation, counts, changesSince } =
        await setUp(layout);
    const before = counts();
    setAttenuation(zoneIds[2], 300);
    const changes = changesSince(before);
    cleanup();
    renders.clear();
    return changes;
}

describe("generator grid render counts", () => {
    afterEach(() => {
        cleanup();
        renders.clear();
        labels.clear();
    });

    it("re-renders only the edited zone's cell", async () => {
        const { zoneIds, setAttenuation, counts, changesSince } = await setUp();
        const before = counts();
        setAttenuation(zoneIds[2], 300);
        // Zone 3 is column 3, Global is column 0
        expect(changesSince(before)).toEqual([
            [0, 0, 0, 1, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0]
        ]);
    });

    it("re-renders a cell whose Global value changed", async () => {
        const { globalId, setAttenuation, counts, changesSince } =
            await setUp();
        const before = counts();
        setAttenuation(globalId, 100);
        const [attenuation] = changesSince(before);
        // Global's own cell and zone 2, which inherits Global's attenuation
        expect(attenuation[0]).toBeGreaterThan(0);
        expect(attenuation[2]).toBeGreaterThan(0);
    });

    it("re-renders no cell of a row that reads nothing Global changed", async () => {
        const { globalId, setAttenuation, counts, changesSince } =
            await setUp();
        const before = counts();
        setAttenuation(globalId, 100);
        const [, pan] = changesSince(before);
        expect(pan).toEqual([0, 0, 0, 0, 0, 0, 0]);
    });

    it("re-renders a cell whose stereo partner changed", async () => {
        const { zoneIds, setAttenuation, counts, changesSince } = await setUp(
            "desktop",
            true
        );
        const before = counts();
        // Zones 5 and 6 share column 5, zone 6 is the partner
        expect(before[0]).toHaveLength(6);
        setAttenuation(zoneIds[5], 300);
        const [attenuation] = changesSince(before);
        expect(attenuation[5]).toBeGreaterThan(0);
    });

    it("re-renders the selected and the Tab stop cells when the selection moves", async () => {
        const { zoneIds, rerender, tree, counts, changesSince } = await setUp();
        rerender(tree(new Set([zoneIds[0]]), zoneIds[0]));
        const before = counts();
        rerender(tree(new Set([zoneIds[3]]), zoneIds[3]));
        // Columns 1 and 4 flipped, in the pan row only the Tab stop moved
        expect(changesSince(before)).toEqual([
            [0, 1, 0, 0, 1, 0, 0],
            [0, 1, 0, 0, 1, 0, 0]
        ]);
    });

    it("re-renders every cell when the language changes", async () => {
        const { i18n, counts, changesSince } = await setUp();
        const before = counts();
        await act(async () => {
            await i18n.changeLanguage("pl");
        });
        for (const row of changesSince(before)) {
            for (const change of row) {
                expect(change).toBeGreaterThan(0);
            }
        }
    });

    it("keeps desktop and phone behavior the same", async () => {
        expect(await getEditChanges("phone")).toEqual(
            await getEditChanges("desktop")
        );
    });
});
