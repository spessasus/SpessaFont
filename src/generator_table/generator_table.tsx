import type * as React from "react";
import {
    BasicInstrument,
    type BasicPreset,
    type GeneratorType,
    GeneratorTypes
} from "spessasynth_core";
import {
    type CellSelection,
    getCellSelection,
    getTapModifiers,
    shouldClearCellSelection
} from "./cell_selection.ts";
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
import { clampZoneIndex, getOneZoneColumns } from "./one_zone_columns.ts";
import { useZoneSwipe } from "./use_zone_swipe.ts";
import { useZoneCommands } from "./use_zone_commands.ts";
import { ZoneListSheet } from "./zone_list_sheet/zone_list_sheet.tsx";

const NO_CELLS = new Set<number>();

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
    // The shown column of the phone's One zone mode. The table remounts per element, so a new
    // element starts at its first zone
    const [zoneIndex, setZoneIndex] = useState(0);
    const [isZoneSheetOpen, setIsZoneSheetOpen] = useState(false);
    const tableRef = useRef<HTMLTableElement | null>(null);
    // The zone of the last phone tap, which a generator added right after it starts on
    const lastTappedZoneIdRef = useRef<number | null>(null);
    const zoneCommands = useZoneCommands(element);
    const children: ZoneChildren = isInstrument
        ? { kind: "samples", views: sampleViews }
        : { kind: "instruments", views: instrumentViews };
    const allZoneColumns = view ? getZoneColumns(view.zones, children) : [];
    const zoneCount = allZoneColumns.length;
    const stepZone = (direction: 1 | -1) =>
        setZoneIndex((previous) =>
            clampZoneIndex(
                clampZoneIndex(previous, zoneCount) + direction,
                zoneCount
            )
        );
    const swipeHandlers = useZoneSwipe(stepZone);
    // The pane closes when its element is removed, this only covers the render before
    if (!view) {
        return null;
    }

    const globalColumn: ZoneColumn = {
        zone: view.globalZone,
        linkedZone: undefined,
        colSpan: 1,
        isStereo: false,
        name: t("soundBankLocale.globalZone"),
        sample: undefined,
        linkedSample: undefined
    };
    const allColumns = [globalColumn, ...allZoneColumns];
    // Pan differs between the left and right sample, so stereo pairs are edited separately
    const allSplitColumns = [
        globalColumn,
        ...getZoneColumns(view.zones, children, true)
    ];
    const allModulatorColumns = getModulatorColumns(
        allColumns,
        allSplitColumns
    );
    const isOneZone = layout === "phone" && phoneGrid.mode === "oneZone";
    const oneZone = isOneZone
        ? getOneZoneColumns(
              allZoneColumns,
              allSplitColumns,
              allModulatorColumns,
              zoneIndex
          )
        : undefined;
    const zoneColumns = oneZone?.zoneColumns ?? allZoneColumns;
    const columns = [globalColumn, ...zoneColumns];
    const splitColumns = oneZone?.splitColumns ?? allSplitColumns;
    const modulatorColumns = oneZone?.modulatorColumns ?? allModulatorColumns;
    const getRowColumns = (generator: GeneratorType) =>
        generator === GeneratorTypes.pan ? splitColumns : columns;

    // The edited zone may be gone after an undo, which closes the editor. A zone of a split
    // pair stays open on its own when an edit gives it the same modulators as its partner.
    // Forgetting the gone zone keeps a redo from opening the editor again
    const editedColumn =
        allModulatorColumns.find((c) => c.zone.id === editedZoneId) ??
        allSplitColumns.find((c) => c.zone.id === editedZoneId);
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
                  // Every zone counts, so One zone mode keeps its rows while stepping
                  hasValue: (r) =>
                      hasStoredValue(
                          r.generator === GeneratorTypes.pan
                              ? allSplitColumns
                              : allColumns,
                          r.generator
                      ),
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

    const jumpToZone = (column: ZoneColumn) => {
        if (isOneZone) {
            setZoneIndex(allZoneColumns.indexOf(column));
            return;
        }
        findGridItem(
            tableRef.current,
            getZoneNameKey(column.zone.id)
        )?.scrollIntoView({ inline: "start", block: "nearest" });
    };

    return (
        <>
            <div
                className={"zone_table_wrapper"}
                // A tap outside the cells dismisses the phone selection
                onClick={
                    layout === "phone"
                        ? (e) => {
                              if (shouldClearCellSelection(e.target)) {
                                  setCellSelection(null);
                              }
                          }
                        : undefined
                }
            >
                {layout === "phone" ? (
                    <GridViewBar
                        mode={phoneGrid.mode}
                        onModeChange={phoneGrid.setMode}
                        isValuesOnly={phoneGrid.isValuesOnly}
                        onValuesOnlyChange={phoneGrid.setValuesOnly}
                        areAllCollapsed={areAllCollapsed}
                        onToggleAll={() =>
                            phoneGrid.setCollapsed(
                                areAllCollapsed ? [] : rowGroups
                            )
                        }
                    />
                ) : null}
                <table
                    ref={(table) => {
                        tableRef.current = table;
                        const key = focusOnMountRef.current;
                        if (!table || key === null) {
                            return;
                        }

                        focusOnMountRef.current = null;
                        findGridItem(table, key)?.focus();
                    }}
                    className={"zone_table" + (isOneZone ? " one_zone" : "")}
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
                            onEditModulators={setEditedZoneId}
                            onOpenZoneList={() => {
                                setCellSelection(null);
                                setIsZoneSheetOpen(true);
                            }}
                            oneZone={
                                oneZone
                                    ? {
                                          index: oneZone.index,
                                          count: zoneCount,
                                          onStep: stepZone
                                      }
                                    : undefined
                            }
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
                    <tbody {...(isOneZone ? swipeHandlers : {})}>
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
                                        onAdd={(generator) => {
                                            const tappedId =
                                                lastTappedZoneIdRef.current;
                                            const zoneId =
                                                tappedId !== null &&
                                                getRowColumns(generator).some(
                                                    (c) =>
                                                        c.zone.id === tappedId
                                                )
                                                    ? tappedId
                                                    : view.globalZone.id;
                                            setCellSelection({
                                                generator,
                                                zoneIds: new Set([zoneId]),
                                                anchorId: zoneId
                                            });
                                        }}
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
                                        cellSelection?.generator ===
                                        row.generator
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
                                    onSelectCell={(zoneId, e) => {
                                        if (layout === "phone") {
                                            lastTappedZoneIdRef.current =
                                                zoneId;
                                            setIsZoneSheetOpen(false);
                                        }
                                        setCellSelection((previous) =>
                                            getCellSelection(
                                                previous,
                                                row.generator,
                                                rowColumns,
                                                zoneId,
                                                getTapModifiers(layout, e)
                                            )
                                        );
                                    }}
                                />
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {layout === "phone" && isZoneSheetOpen ? (
                <ZoneListSheet
                    columns={allZoneColumns}
                    globalZone={view.globalZone}
                    isInstrument={isInstrument}
                    onJump={jumpToZone}
                    onAddZone={() => void zoneCommands.add()}
                    onClose={() => setIsZoneSheetOpen(false)}
                />
            ) : null}
        </>
    );
}
