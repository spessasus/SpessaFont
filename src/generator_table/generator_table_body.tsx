import type {
    BasicInstrument,
    BasicPreset,
    GeneratorType
} from "spessasynth_core";
import type { SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import type { ZoneView } from "../core_backend/entity_views.ts";
import { useLayout } from "../layout/layout_context.ts";
import {
    type CellSelection,
    getCellSelection,
    getTapModifiers
} from "./cell_selection.ts";
import type { GridRow } from "./grid_rows.ts";
import type { GeneratorGroup } from "./generator_groups.ts";
import { GeneratorGroupRow } from "./generator_group_row.tsx";
import { AddGeneratorRow } from "./add_generator_row.tsx";
import { GeneratorRow } from "./generator_row.tsx";
import { parseCellKey } from "./table_navigation.ts";
import { isCurveRow } from "./tools/key_curve_actions.ts";
import { useElementTools } from "./tools/use_element_tools.tsx";
import type { ZoneColumn } from "./zone_columns.ts";
import type { useZoneSwipe } from "./use_zone_swipe.ts";

const NO_CELLS = new Set<number>();

interface GeneratorTableBodyProps {
    element: BasicPreset | BasicInstrument;
    gridRows: readonly GridRow[];
    getRowColumns: (generator: GeneratorType) => readonly ZoneColumn[];
    globalZone: ZoneView;
    hasZones: boolean;
    /**
     * The table's Tab stop.
     */
    tabKey: string;
    cellSelection: CellSelection | null;
    onSelectionChange: (action: SetStateAction<CellSelection | null>) => void;
    columnCount: number;
    /**
     * The swipe of the phone's One zone mode.
     */
    swipeHandlers: ReturnType<typeof useZoneSwipe> | undefined;
    onToggleGroup: (group: GeneratorGroup) => void;
    /**
     * The zone a generator added on a phone starts on.
     */
    getAddedZoneId: (generator: GeneratorType) => number;
    /**
     * A tap on a phone cell, before it changes the selection.
     */
    onPhoneTap: (zoneId: number) => void;
}

/**
 * The generator rows of the table, with the phone's group and Add generator rows.
 */
export function GeneratorTableBody({
    element,
    gridRows,
    getRowColumns,
    globalZone,
    hasZones,
    tabKey,
    cellSelection,
    onSelectionChange,
    columnCount,
    swipeHandlers,
    onToggleGroup,
    getAddedZoneId,
    onPhoneTap
}: GeneratorTableBodyProps) {
    const { t } = useTranslation();
    const layout = useLayout();
    const tools = useElementTools();
    return (
        <tbody {...swipeHandlers}>
            {gridRows.map((gridRow) => {
                if (gridRow.type === "group") {
                    return (
                        <GeneratorGroupRow
                            key={`group:${gridRow.group}`}
                            group={gridRow.group}
                            visibleCount={gridRow.visibleCount}
                            isCollapsed={gridRow.isCollapsed}
                            columnCount={columnCount}
                            onToggle={() => onToggleGroup(gridRow.group)}
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
                                const zoneId = getAddedZoneId(generator);
                                onSelectionChange({
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
                        globalZone={globalZone}
                        activeKey={
                            parseCellKey(tabKey)?.generator === row.generator
                                ? tabKey
                                : undefined
                        }
                        selectedZoneIds={
                            cellSelection?.generator === row.generator
                                ? cellSelection.zoneIds
                                : NO_CELLS
                        }
                        headerMenu={
                            hasZones && isCurveRow(row)
                                ? [
                                      {
                                          label: t("toolsLocale.keyCurve.menu"),
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
                                onPhoneTap(zoneId);
                            }
                            onSelectionChange((previous) =>
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
    );
}
