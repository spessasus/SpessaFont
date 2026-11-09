import type * as React from "react";
import { memo } from "react";
import type { TFunction } from "i18next";
import type { SampleView, ZoneView } from "../core_backend/entity_views.ts";
import { GeneratorCell } from "./cell/generator_cell.tsx";
import { SelectCell } from "./cell/select_cell.tsx";
import type { CellValue } from "./cell/cell_values.ts";
import type { GeneratorOptions } from "./generator_options.ts";
import type { GeneratorRowType } from "./generator_row_type.ts";
import { getCellKey } from "./table_navigation.ts";

/**
 * What the cells of a row do, by zone id. The row keeps one object for all its cells, so a
 * commit or a selection elsewhere does not render them again.
 */
export interface RowCellHandlers {
    select: (zoneId: number, event: React.MouseEvent) => void;
    openMenu: (zoneId: number, event: React.MouseEvent) => void;
    /**
     * Commits typed text. False when the cell cannot take it, which keeps the edit open.
     */
    commitText: (zoneId: number, text: string) => boolean;
    pick: (zoneId: number, value: number | null) => void;
    selectKeyDown: (
        zoneId: number,
        event: React.KeyboardEvent<HTMLElement>
    ) => void;
    copy: (zoneId: number) => string;
    cut: (zoneId: number) => string;
    paste: (zoneId: number, text: string) => void;
    clear: (zoneId: number) => void;
    nudge: (zoneId: number, direction: 1 | -1, steps: number) => void;
}

interface GeneratorRowCellProps {
    row: GeneratorRowType;
    isInstrument: boolean;
    /**
     * The row's generator name, for the cell's label.
     */
    generatorName: string;
    options: GeneratorOptions | undefined;
    zone: ZoneView;
    linkedZone: ZoneView | undefined;
    sample: SampleView | undefined;
    linkedSample: SampleView | undefined;
    name: string;
    colSpan: number;
    isStereo: boolean;
    /**
     * What the global zone stores for this row, null in the global zone's own cell.
     */
    globalValue: CellValue;
    isSelected: boolean;
    isActive: boolean;
    t: TFunction;
    handlers: RowCellHandlers;
}

/**
 * One cell of a generator row. It takes views and plain values only, so it renders again
 * only when its own zones, the global value, its selection or the language change.
 */
export const GeneratorRowCell = memo(function GeneratorRowCell({
    row,
    isInstrument,
    generatorName,
    options,
    zone,
    linkedZone,
    sample,
    linkedSample,
    name,
    colSpan,
    isStereo,
    globalValue,
    isSelected,
    isActive,
    t,
    handlers
}: GeneratorRowCellProps) {
    const { generator } = row;
    const zoneId = zone.id;
    const column = {
        zone,
        linkedZone,
        colSpan,
        isStereo,
        name,
        sample,
        linkedSample
    };
    const gridKey = getCellKey(generator, zoneId);
    const label = t("soundBankLocale.cellLabel", {
        generator: generatorName,
        zone: name
    });
    const handleSelect = (e: React.MouseEvent) => handlers.select(zoneId, e);
    const handleContextMenu = (e: React.MouseEvent) =>
        handlers.openMenu(zoneId, e);
    const handleNudge = (direction: 1 | -1, steps: number) =>
        handlers.nudge(zoneId, direction, steps);
    if (options) {
        return (
            <SelectCell
                column={column}
                generator={generator}
                options={options}
                label={label}
                isSelected={isSelected}
                gridKey={gridKey}
                isActive={isActive}
                onPick={(v) => handlers.pick(zoneId, v)}
                onNudge={handleNudge}
                onCellKeyDown={(e) => handlers.selectKeyDown(zoneId, e)}
                onClick={handleSelect}
                onContextMenu={handleContextMenu}
            />
        );
    }
    return (
        <GeneratorCell
            context={{ row, isInstrument }}
            column={column}
            globalValue={globalValue}
            label={label}
            gridKey={gridKey}
            isActive={isActive}
            isSelected={isSelected}
            onSelect={handleSelect}
            onCommit={(text) => handlers.commitText(zoneId, text)}
            commands={{
                copy: () => handlers.copy(zoneId),
                cut: () => handlers.cut(zoneId),
                paste: (text) => handlers.paste(zoneId, text),
                clear: () => handlers.clear(zoneId),
                nudge: handleNudge
            }}
            onContextMenu={handleContextMenu}
        />
    );
});
