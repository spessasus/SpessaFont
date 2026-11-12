import type {
    BasicInstrument,
    BasicPreset,
    GeneratorType
} from "spessasynth_core";
import type { ZoneView } from "../core_backend/entity_views.ts";
import type { CellSelection } from "./cell_selection.ts";
import type { GeneratorRowType } from "./generator_row_type.ts";
import type { ZoneColumn } from "./zone_columns.ts";
import { CellSheet } from "./cell_sheet/cell_sheet.tsx";
import { mapSelectionToRow } from "./cell_sheet/cell_sheet_selection.ts";
import { ZoneListSheet } from "./zone_list_sheet/zone_list_sheet.tsx";
import { Presence } from "../presence/presence.tsx";

interface PhoneGridSheetsProps {
    element: BasicPreset | BasicInstrument;
    rows: readonly GeneratorRowType[];
    sheetRow: GeneratorRowType | undefined;
    cellSelection: CellSelection | null;
    onSelectionChange: (selection: CellSelection | null) => void;
    /**
     * Every column of a row, also in One zone mode.
     */
    getAllRowColumns: (generator: GeneratorType) => readonly ZoneColumn[];
    /**
     * Every zone column, for the zone colors and the zone list.
     */
    zoneColumns: readonly ZoneColumn[];
    globalZone: ZoneView;
    isInstrument: boolean;
    isZoneSheetOpen: boolean;
    onCloseZoneSheet: () => void;
    onJump: (column: ZoneColumn) => void;
    onAddZone: () => void;
    onEditModulators: (zoneId: number) => void;
}

/**
 * The phone grid's cell sheet and Zones sheet.
 */
export function PhoneGridSheets({
    element,
    rows,
    sheetRow,
    cellSelection,
    onSelectionChange,
    getAllRowColumns,
    zoneColumns,
    globalZone,
    isInstrument,
    isZoneSheetOpen,
    onCloseZoneSheet,
    onJump,
    onAddZone,
    onEditModulators
}: PhoneGridSheetsProps) {
    return (
        <>
            <Presence>
                {cellSelection && sheetRow ? (
                    <CellSheet
                        element={element}
                        rows={rows}
                        row={sheetRow}
                        columns={getAllRowColumns(cellSelection.generator)}
                        colorColumns={zoneColumns}
                        globalZone={globalZone}
                        checkedIds={cellSelection.zoneIds}
                        onCheckedChange={(ids) =>
                            onSelectionChange({
                                ...cellSelection,
                                zoneIds: ids
                            })
                        }
                        onRowChange={(generator) =>
                            onSelectionChange({
                                generator,
                                zoneIds: mapSelectionToRow(
                                    cellSelection.zoneIds,
                                    getAllRowColumns(cellSelection.generator),
                                    getAllRowColumns(generator)
                                ),
                                anchorId: cellSelection.anchorId
                            })
                        }
                        onEditModulators={onEditModulators}
                        onClose={() => onSelectionChange(null)}
                    />
                ) : null}
            </Presence>
            <Presence>
                {isZoneSheetOpen ? (
                    <ZoneListSheet
                        columns={zoneColumns}
                        globalZone={globalZone}
                        isInstrument={isInstrument}
                        onJump={onJump}
                        onAddZone={onAddZone}
                        onClose={onCloseZoneSheet}
                    />
                ) : null}
            </Presence>
        </>
    );
}
