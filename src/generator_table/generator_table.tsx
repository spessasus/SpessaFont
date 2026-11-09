import type * as React from "react";
import {
    BasicInstrument,
    type BasicPreset,
    type GeneratorType,
    GeneratorTypes
} from "spessasynth_core";
import {
    type CellSelection,
    getMovedSelection,
    shouldClearCellSelection
} from "./cell_selection.ts";
import type { GeneratorRowType } from "./generator_row_type.ts";
import { TableHeader } from "./table_header.tsx";
import "./generator_table.css";
import "./generator_table_phone.css";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
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
    handleTableKeyDown,
    getTabKey
} from "./table_navigation.ts";
import { useLayout } from "../layout/layout_context.ts";
import { usePhoneGrid } from "./use_phone_grid.ts";
import { getGridRows, type GridRow, hasStoredValue } from "./grid_rows.ts";
import { GridViewBar } from "./grid_view_bar.tsx";
import { getOneZoneColumns } from "./one_zone_columns.ts";
import { useZoneCommands } from "./use_zone_commands.ts";
import { PhoneGridSheets } from "./phone_grid_sheets.tsx";
import { GeneratorTableBody } from "./generator_table_body.tsx";

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
    const [editedZoneId, setEditedZoneId] = useState<number | null>(null);
    const [cellSelection, setCellSelection] = useState<CellSelection | null>(
        null
    );
    // The last focused item of the table, which is its Tab stop
    const [activeKey, setActiveKey] = useState<string | null>(null);
    // Focused when the table comes back after the modulator editor
    const focusOnMountRef = useRef<string | null>(null);
    const layout = useLayout();
    const zoneCommands = useZoneCommands(element);
    const children: ZoneChildren = isInstrument
        ? { kind: "samples", views: sampleViews }
        : { kind: "instruments", views: instrumentViews };
    const allZoneColumns = view ? getZoneColumns(view.zones, children) : [];
    const zoneCount = allZoneColumns.length;
    // The first checked zone's cell, which the grid keeps in view
    const [firstCheckedId] = cellSelection?.zoneIds ?? NO_CELLS;
    const revealKey =
        cellSelection && firstCheckedId !== undefined
            ? getCellKey(cellSelection.generator, firstCheckedId)
            : null;
    const phoneGrid = usePhoneGrid({
        isPhone: layout === "phone",
        rows,
        zoneColumns: allZoneColumns,
        revealKey
    });
    const { tableRef, wrapperRef, lastTappedZoneIdRef } = phoneGrid;
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
    const oneZone = phoneGrid.isOneZone
        ? getOneZoneColumns(
              allZoneColumns,
              allSplitColumns,
              allModulatorColumns,
              phoneGrid.zoneIndex
          )
        : undefined;
    const zoneColumns = oneZone?.zoneColumns ?? allZoneColumns;
    const columns = [globalColumn, ...zoneColumns];
    const splitColumns = oneZone?.splitColumns ?? allSplitColumns;
    const modulatorColumns = oneZone?.modulatorColumns ?? allModulatorColumns;
    const getRowColumns = (generator: GeneratorType) =>
        generator === GeneratorTypes.pan ? splitColumns : columns;
    // The cell sheet lists every zone, also when One zone mode shows one
    const getAllRowColumns = (generator: GeneratorType) =>
        generator === GeneratorTypes.pan ? allSplitColumns : allColumns;

    // The edited zone may be gone after an undo, which closes the editor. A zone of a split
    // pair stays open on its own when an edit gives it the same modulators as its partner.
    // Forgetting the gone zone keeps a redo from opening the editor again
    const editedColumn =
        allModulatorColumns.find((c) => c.zone.id === editedZoneId) ??
        allSplitColumns.find((c) => c.zone.id === editedZoneId);
    if (editedZoneId !== null && !editedColumn) {
        setEditedZoneId(null);
    }
    if (editedColumn && layout !== "phone") {
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

    // Clears the cell selection first, so the cell sheet's back handler cannot outrank the
    // phone's modulator layer
    const openModulators = (zoneId: number) => {
        setCellSelection(null);
        phoneGrid.setIsZoneSheetOpen(false);
        setEditedZoneId(zoneId);
    };

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
                  isValuesOnly: phoneGrid.settings.isValuesOnly,
                  collapsed: phoneGrid.settings.collapsed,
                  keptGenerator: cellSelection?.generator
              })
            : rows.map((row) => ({ type: "generator", row }));
    const shownRows = gridRows.flatMap((r) =>
        r.type === "generator" ? [r.row] : []
    );
    const columnCount =
        1 + columns.reduce((sum, column) => sum + column.colSpan, 0);

    const tabKey = getTabKey(activeKey, {
        zoneIds: zoneColumns.map((c) => c.zone.id),
        modulatorZoneIds: modulatorColumns.map((c) => c.zone.id),
        rows: shownRows.map(({ generator }) => ({
            generator,
            zoneIds: getRowColumns(generator).map((c) => c.zone.id)
        })),
        globalZoneId: view.globalZone.id
    });
    const isHeaderKey =
        tabKey === ADD_ZONE_KEY ||
        tabKey.startsWith("name:") ||
        tabKey.startsWith("delete:");

    const handleMove = (fromKey: string, toKey: string, isExtending: boolean) =>
        setCellSelection((previous) =>
            getMovedSelection(
                previous,
                fromKey,
                toKey,
                isExtending,
                rows,
                getRowColumns
            )
        );

    const sheetRow = rows.find((r) => r.generator === cellSelection?.generator);

    return (
        <>
            <div
                ref={wrapperRef}
                className={"zone_table_wrapper"}
                // The phone's modulator layer covers the grid, which keeps its scroll position
                inert={layout === "phone" && editedColumn !== undefined}
                data-covered={layout === "phone" ? !!editedColumn : undefined}
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
                        mode={phoneGrid.settings.mode}
                        onModeChange={phoneGrid.settings.setMode}
                        isValuesOnly={phoneGrid.settings.isValuesOnly}
                        onValuesOnlyChange={phoneGrid.settings.setValuesOnly}
                        areAllCollapsed={phoneGrid.areAllCollapsed}
                        onToggleAll={phoneGrid.toggleAllGroups}
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
                    className={
                        "zone_table" + (phoneGrid.isOneZone ? " one_zone" : "")
                    }
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
                            onEditModulators={openModulators}
                            onOpenZoneList={() => {
                                setCellSelection(null);
                                phoneGrid.setIsZoneSheetOpen(true);
                            }}
                            oneZone={
                                oneZone
                                    ? {
                                          index: oneZone.index,
                                          count: zoneCount,
                                          onStep: phoneGrid.stepZone
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
                            onEditModulators={openModulators}
                        />
                    </thead>
                    <GeneratorTableBody
                        element={element}
                        gridRows={gridRows}
                        getRowColumns={getRowColumns}
                        globalZone={view.globalZone}
                        hasZones={view.zones.length > 0}
                        tabKey={tabKey}
                        cellSelection={cellSelection}
                        onSelectionChange={setCellSelection}
                        columnCount={columnCount}
                        swipeHandlers={
                            phoneGrid.isOneZone
                                ? phoneGrid.swipeHandlers
                                : undefined
                        }
                        onToggleGroup={phoneGrid.settings.toggleGroup}
                        getAddedZoneId={(generator) => {
                            const tappedId = lastTappedZoneIdRef.current;
                            return tappedId !== null &&
                                getRowColumns(generator).some(
                                    (c) => c.zone.id === tappedId
                                )
                                ? tappedId
                                : view.globalZone.id;
                        }}
                        onPhoneTap={(zoneId) => {
                            lastTappedZoneIdRef.current = zoneId;
                            phoneGrid.setIsZoneSheetOpen(false);
                        }}
                    />
                </table>
            </div>
            {layout === "phone" ? (
                <PhoneGridSheets
                    element={element}
                    rows={rows}
                    sheetRow={sheetRow}
                    cellSelection={cellSelection}
                    onSelectionChange={setCellSelection}
                    getAllRowColumns={getAllRowColumns}
                    zoneColumns={allZoneColumns}
                    globalZone={view.globalZone}
                    isInstrument={isInstrument}
                    isZoneSheetOpen={phoneGrid.isZoneSheetOpen}
                    onCloseZoneSheet={() => phoneGrid.setIsZoneSheetOpen(false)}
                    onJump={phoneGrid.jumpToZone}
                    onAddZone={() => void zoneCommands.add()}
                    onEditModulators={openModulators}
                />
            ) : null}
            {editedColumn ? (
                <div className={"modulator_layer"}>
                    <ModulatorEditor
                        name={editedColumn.name}
                        column={editedColumn}
                        onClose={() => {
                            const key = getModulatorKey(editedColumn.zone.id);
                            // The grid is inert until it renders without the layer
                            flushSync(() => {
                                setActiveKey(key);
                                setEditedZoneId(null);
                            });
                            findGridItem(tableRef.current, key)?.focus({
                                preventScroll: true
                            });
                        }}
                        element={element}
                        defaultModulators={
                            isInstrument ? defaultModulators : []
                        }
                    />
                </div>
            ) : null}
        </>
    );
}
