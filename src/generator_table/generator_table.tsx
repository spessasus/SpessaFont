import type * as React from "react";
import {
    BasicInstrument,
    type BasicPreset,
    type GeneratorType,
    GeneratorTypes
} from "spessasynth_core";
import type { GeneratorRowType } from "./generator_row_type.ts";
import { TableHeader } from "./table_header.tsx";
import { GeneratorRow } from "./generator_row.tsx";
import "./generator_table.css";
import "./generator_table_phone.css";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ModulatorRow } from "./modulator_row.tsx";
import { ModulatorEditor } from "./modulator_edit/modulator_editor.tsx";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useBankSnapshot } from "../hooks/use_bank_snapshot.ts";
import { getObjectId } from "../utils/object_id.ts";
import {
    getModulatorColumns,
    getZoneColumns,
    type ZoneChildren,
    type ZoneColumn
} from "./zone_columns.ts";
import {
    ADD_ZONE_KEY,
    findGridItem,
    getCellKey,
    getGridKey,
    getModulatorKey,
    getZoneDeleteKey,
    getZoneNameKey,
    handleTableKeyDown,
    parseCellKey
} from "./table_navigation.ts";
import { useElementTools } from "./tools/use_element_tools.tsx";
import { isCurveRow } from "./tools/key_curve_actions.ts";
import { useLayout } from "../layout/layout_context.ts";
import { usePhoneGridSettings } from "./use_phone_grid_settings.ts";
import { getGridRows, type GridRow, hasStoredValue } from "./grid_rows.ts";
import {
    GENERATOR_GROUP_ORDER,
    GROUP_OF_GENERATOR
} from "./generator_groups.ts";
import { GeneratorGroupRow } from "./generator_group_row.tsx";
import { AddGeneratorRow } from "./add_generator_row.tsx";
import { GridViewBar } from "./grid_view_bar.tsx";

/**
 * Cells selected with Ctrl or Shift, all in one generator row.
 */
interface CellSelection {
    generator: GeneratorType;
    zoneIds: ReadonlySet<number>;
    anchorId: number;
}

interface SelectionModifiers {
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
}

const NO_CELLS = new Set<number>();

/**
 * The selection after a click on a cell: Ctrl toggles the cell, Shift selects the cells from the
 * last clicked one, a plain click selects nothing. A click in another row starts over there.
 */
function getCellSelection(
    previous: CellSelection | null,
    generator: GeneratorType,
    columns: readonly ZoneColumn[],
    zoneId: number,
    { ctrlKey, metaKey, shiftKey }: SelectionModifiers
) {
    const isSameRow = previous?.generator === generator;
    const ids = columns.map((c) => c.zone.id);
    // The anchor's zone may be gone after an undo, then Shift starts over
    if (shiftKey && isSameRow && ids.includes(previous.anchorId)) {
        const from = ids.indexOf(previous.anchorId);
        const to = ids.indexOf(zoneId);
        const range = ids.slice(Math.min(from, to), Math.max(from, to) + 1);
        return { ...previous, zoneIds: new Set(range) };
    }
    if (ctrlKey || metaKey || shiftKey) {
        const zoneIds = new Set(isSameRow ? previous.zoneIds : []);
        if (zoneIds.has(zoneId)) {
            zoneIds.delete(zoneId);
        } else {
            zoneIds.add(zoneId);
        }
        return { generator, zoneIds, anchorId: zoneId };
    }
    return null;
}

interface GeneratorTableProps {
    /**
     * The edited element, for the actions. What the table shows comes from its view.
     */
    element: BasicPreset | BasicInstrument;
    rows: readonly GeneratorRowType[];
}

/**
 * Rendered with a key per element, so the modulator editor closes when the element changes.
 * The table is one Tab stop, see `table_navigation.ts`.
 */
export function GeneratorTable({ element, rows }: GeneratorTableProps) {
    const { t } = useTranslation();
    const { session } = useBankEditor();
    const isInstrument = element instanceof BasicInstrument;
    const id = getObjectId(element);
    const view = useBankSnapshot(session.store, (s) =>
        isInstrument ? s.views.instruments.get(id) : s.views.presets.get(id)
    );
    const sampleViews = useBankSnapshot(session.store, (s) => s.views.samples);
    const instrumentViews = useBankSnapshot(
        session.store,
        (s) => s.views.instruments
    );
    const defaultModulators = useBankSnapshot(
        session.store,
        (s) => s.views.defaultModulators
    );
    const tools = useElementTools();
    const [editedZoneId, setEditedZoneId] = useState<number | null>(null);
    const [cellSelection, setCellSelection] = useState<CellSelection | null>(
        null
    );
    // The last focused item of the table, which is its Tab stop
    const [activeKey, setActiveKey] = useState<string | null>(null);
    // Focused when the table comes back after the modulator editor
    const focusOnMountRef = useRef<string | null>(null);
    const layout = useLayout();
    const phoneGrid = usePhoneGridSettings();
    // The pane closes when its element is removed, this only covers the render before
    if (!view) {
        return null;
    }
    const children: ZoneChildren = isInstrument
        ? { kind: "samples", views: sampleViews }
        : { kind: "instruments", views: instrumentViews };

    const globalColumn: ZoneColumn = {
        zone: view.globalZone,
        linkedZone: undefined,
        colSpan: 1,
        isStereo: false,
        name: t("soundBankLocale.globalZone"),
        sample: undefined,
        linkedSample: undefined
    };
    const zoneColumns = getZoneColumns(view.zones, children);
    const columns = [globalColumn, ...zoneColumns];
    // Pan differs between the left and right sample, so stereo pairs are edited separately
    const splitColumns = [
        globalColumn,
        ...getZoneColumns(view.zones, children, true)
    ];
    const getRowColumns = (generator: GeneratorType) =>
        generator === GeneratorTypes.pan ? splitColumns : columns;
    const modulatorColumns = getModulatorColumns(columns, splitColumns);

    // The edited zone may be gone after an undo, which closes the editor. A zone of a split
    // pair stays open on its own when an edit gives it the same modulators as its partner.
    // Forgetting the gone zone keeps a redo from opening the editor again
    const editedColumn =
        modulatorColumns.find((c) => c.zone.id === editedZoneId) ??
        splitColumns.find((c) => c.zone.id === editedZoneId);
    if (editedZoneId !== null && !editedColumn) {
        setEditedZoneId(null);
    }
    if (editedColumn) {
        return (
            <ModulatorEditor
                name={editedColumn.name}
                column={editedColumn}
                onClose={() => {
                    const key = getModulatorKey(editedColumn.zone.id);
                    focusOnMountRef.current = key;
                    setActiveKey(key);
                    setEditedZoneId(null);
                }}
                element={element}
                defaultModulators={isInstrument ? defaultModulators : []}
            />
        );
    }

    const gridRows: GridRow[] =
        layout === "phone"
            ? getGridRows(rows, {
                  hasValue: (r) =>
                      hasStoredValue(getRowColumns(r.generator), r.generator),
                  isValuesOnly: phoneGrid.isValuesOnly,
                  collapsed: phoneGrid.collapsed,
                  keptGenerator: cellSelection?.generator
              })
            : rows.map((row) => ({ type: "generator", row }));
    const shownRows = gridRows.flatMap((r) =>
        r.type === "generator" ? [r.row] : []
    );
    const columnCount =
        1 + columns.reduce((sum, column) => sum + column.colSpan, 0);
    const rowGroups = GENERATOR_GROUP_ORDER.filter((group) =>
        rows.some((r) => GROUP_OF_GENERATOR.get(r.generator) === group)
    );
    const areAllCollapsed = rowGroups.every((group) =>
        phoneGrid.collapsed.has(group)
    );

    // The Tab stop falls back to the first cell when its item is gone (a deleted zone)
    const shownKeys = new Set<string>([ADD_ZONE_KEY]);
    for (const { zone } of zoneColumns) {
        shownKeys.add(getZoneNameKey(zone.id));
        shownKeys.add(getZoneDeleteKey(zone.id));
    }
    for (const { zone } of modulatorColumns) {
        shownKeys.add(getModulatorKey(zone.id));
    }
    for (const { generator } of shownRows) {
        for (const { zone } of getRowColumns(generator)) {
            shownKeys.add(getCellKey(generator, zone.id));
        }
    }
    const firstKey =
        shownRows.length > 0
            ? getCellKey(shownRows[0].generator, view.globalZone.id)
            : ADD_ZONE_KEY;
    const tabKey =
        activeKey !== null && shownKeys.has(activeKey) ? activeKey : firstKey;
    const isHeaderKey =
        tabKey === ADD_ZONE_KEY ||
        tabKey.startsWith("name:") ||
        tabKey.startsWith("delete:");

    // Shift and Left or Right extends the selection, other moves drop it, like a spreadsheet
    const handleMove = (
        fromKey: string,
        toKey: string,
        isExtending: boolean
    ) => {
        const from = parseCellKey(fromKey);
        const to = parseCellKey(toKey);
        const generator = rows.find(
            (r) => r.generator === to?.generator
        )?.generator;
        if (
            !isExtending ||
            !from ||
            !to ||
            generator === undefined ||
            from.generator !== generator
        ) {
            setCellSelection(null);
            return;
        }
        setCellSelection((previous) =>
            getCellSelection(
                previous?.generator === generator && previous.zoneIds.size > 0
                    ? previous
                    : {
                          generator,
                          zoneIds: new Set([from.zoneId]),
                          anchorId: from.zoneId
                      },
                generator,
                getRowColumns(generator),
                to.zoneId,
                { ctrlKey: false, metaKey: false, shiftKey: true }
            )
        );
    };

    return (
        <div className={"zone_table_wrapper"}>
            {layout === "phone" ? (
                <GridViewBar
                    mode={phoneGrid.mode}
                    onModeChange={phoneGrid.setMode}
                    isValuesOnly={phoneGrid.isValuesOnly}
                    onValuesOnlyChange={phoneGrid.setValuesOnly}
                    areAllCollapsed={areAllCollapsed}
                    onToggleAll={() =>
                        phoneGrid.setCollapsed(areAllCollapsed ? [] : rowGroups)
                    }
                />
            ) : null}
            <table
                ref={(table) => {
                    const key = focusOnMountRef.current;
                    if (!table || key === null) {
                        return;
                    }

                    focusOnMountRef.current = null;
                    findGridItem(table, key)?.focus();
                }}
                className={"zone_table"}
                role={"grid"}
                aria-multiselectable={true}
                onKeyDown={(e) => handleTableKeyDown(e, handleMove)}
                onFocus={(e: React.FocusEvent) => {
                    const key = getGridKey(e.target);
                    if (key !== undefined) {
                        setActiveKey(key);
                    }
                }}
            >
                <thead>
                    <TableHeader
                        element={element}
                        name={view.name}
                        columns={zoneColumns}
                        globalZone={view.globalZone}
                        activeKey={isHeaderKey ? tabKey : undefined}
                    />
                    <ModulatorRow
                        columns={modulatorColumns}
                        activeKey={
                            tabKey.startsWith("modulators:")
                                ? tabKey
                                : undefined
                        }
                        onEditModulators={setEditedZoneId}
                    />
                </thead>
                <tbody>
                    {gridRows.map((gridRow) => {
                        if (gridRow.type === "group") {
                            return (
                                <GeneratorGroupRow
                                    key={`group:${gridRow.group}`}
                                    group={gridRow.group}
                                    visibleCount={gridRow.visibleCount}
                                    isCollapsed={gridRow.isCollapsed}
                                    columnCount={columnCount}
                                    onToggle={() =>
                                        phoneGrid.toggleGroup(gridRow.group)
                                    }
                                />
                            );
                        }
                        if (gridRow.type === "addGenerator") {
                            return (
                                <AddGeneratorRow
                                    key={`add:${gridRow.group}`}
                                    group={gridRow.group}
                                    hidden={gridRow.hidden}
                                    columnCount={columnCount}
                                    onAdd={(generator) =>
                                        setCellSelection({
                                            generator,
                                            zoneIds: new Set([
                                                view.globalZone.id
                                            ]),
                                            anchorId: view.globalZone.id
                                        })
                                    }
                                />
                            );
                        }
                        const { row } = gridRow;
                        const rowColumns = getRowColumns(row.generator);
                        return (
                            <GeneratorRow
                                key={row.generator}
                                element={element}
                                row={row}
                                columns={rowColumns}
                                globalZone={view.globalZone}
                                activeKey={
                                    parseCellKey(tabKey)?.generator ===
                                    row.generator
                                        ? tabKey
                                        : undefined
                                }
                                selectedZoneIds={
                                    cellSelection?.generator === row.generator
                                        ? cellSelection.zoneIds
                                        : NO_CELLS
                                }
                                headerMenu={
                                    isCurveRow(row) && view.zones.length > 0
                                        ? [
                                              {
                                                  label: t(
                                                      "toolsLocale.keyCurve.menu"
                                                  ),
                                                  onSelect: () =>
                                                      void tools.openKeyCurve(
                                                          [element],
                                                          row.generator
                                                      )
                                              }
                                          ]
                                        : undefined
                                }
                                onSelectCell={(zoneId, e) =>
                                    setCellSelection((previous) =>
                                        getCellSelection(
                                            previous,
                                            row.generator,
                                            rowColumns,
                                            zoneId,
                                            e
                                        )
                                    )
                                }
                            />
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
