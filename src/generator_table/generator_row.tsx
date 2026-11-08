import "./cell/generator_cell.css";
import "./cell/generator_cell_phone.css";
import { useLayout } from "../layout/layout_context.ts";
import type * as React from "react";
import { BasicInstrument, type BasicPreset } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { generatorLocaleMap } from "../utils/translated_options/generator_to_locale_map.ts";
import { GeneratorCell } from "./cell/generator_cell.tsx";
import { SelectCell } from "./cell/select_cell.tsx";
import type { GeneratorRowType } from "./generator_row_type.ts";
import type { ZoneColumn } from "./zone_columns.ts";
import type { ZoneView } from "../core_backend/entity_views.ts";
import { GENERATOR_UNITS } from "./generator_unit.ts";
import { useCellCommands } from "./cell/use_cell_commands.ts";
import { getGeneratorOptions } from "./generator_options.ts";
import type { CellContext } from "./cell/cell_values.ts";
import { getCellKey } from "./table_navigation.ts";
import {
    type ContextMenuEntry,
    useContextMenu
} from "../context_menu/context_menu_context.ts";

interface GeneratorRowProps {
    element: BasicPreset | BasicInstrument;
    row: GeneratorRowType;
    /**
     * The global zone column followed by the zone columns.
     */
    columns: readonly ZoneColumn[];
    /**
     * The element's global zone, which unset zone cells inherit from.
     */
    globalZone: ZoneView;
    /**
     * The view ids of the selected zones in this row.
     */
    selectedZoneIds: ReadonlySet<number>;
    /**
     * The key of the table's Tab stop when it is in this row.
     */
    activeKey: string | undefined;
    onSelectCell: (zoneId: number, event: React.MouseEvent) => void;
    /**
     * The entries of the row header's right-click menu, if it has one.
     */
    headerMenu: ContextMenuEntry[] | undefined;
}

export function GeneratorRow({
    element,
    row,
    columns,
    globalZone,
    selectedZoneIds,
    activeKey,
    onSelectCell,
    headerMenu
}: GeneratorRowProps) {
    const { t } = useTranslation();
    const { openMenu } = useContextMenu();
    const layout = useLayout();
    const { generator } = row;
    const name = t(generatorLocaleMap[generator]);
    const unit = row.unit ? GENERATOR_UNITS[row.unit] : undefined;
    const options = getGeneratorOptions(generator);
    const context: CellContext = {
        element,
        row,
        isInstrument: element instanceof BasicInstrument
    };
    const selectedColumns = columns.filter((c) =>
        selectedZoneIds.has(c.zone.id)
    );
    const commands = useCellCommands(element, row, columns, selectedColumns);
    return (
        <tr
            className={
                row.highlight ? "generator_row_highlight" : "generator_row"
            }
        >
            <th
                className={"generator_cell_header"}
                scope={"row"}
                onContextMenu={
                    headerMenu
                        ? (e) => openMenu(e, headerMenu, { title: name })
                        : undefined
                }
            >
                <div>
                    <span>{name}</span>
                    {unit ? (
                        layout === "phone" ? (
                            <i className={"generator_unit_line"}>
                                {t(unit.suffix)}
                            </i>
                        ) : (
                            <i title={t(unit.full)}>{t(unit.suffix)}</i>
                        )
                    ) : null}
                </div>
            </th>
            {columns.map((column) => {
                const gridKey = getCellKey(generator, column.zone.id);
                const isSelected = selectedZoneIds.has(column.zone.id);
                const label = t("soundBankLocale.cellLabel", {
                    generator: name,
                    zone: column.name
                });
                const onSelect = (e: React.MouseEvent) =>
                    onSelectCell(column.zone.id, e);
                const onContextMenu = (e: React.MouseEvent) =>
                    openMenu(e, commands.getMenuEntries(column), {
                        title: label
                    });
                if (options) {
                    return (
                        <SelectCell
                            key={column.zone.id}
                            column={column}
                            generator={generator}
                            options={options}
                            label={label}
                            isSelected={isSelected}
                            gridKey={gridKey}
                            isActive={activeKey === gridKey}
                            onPick={(v) => commands.pick(column, v)}
                            onNudge={commands.getInputCommands(column).nudge}
                            onCellKeyDown={(e) =>
                                commands.handleSelectKeyDown(e, column)
                            }
                            onClick={onSelect}
                            onContextMenu={onContextMenu}
                        />
                    );
                }
                return (
                    <GeneratorCell
                        key={column.zone.id}
                        context={context}
                        column={column}
                        globalZone={globalZone}
                        label={label}
                        gridKey={gridKey}
                        isActive={activeKey === gridKey}
                        isSelected={isSelected}
                        selectedColumns={selectedColumns}
                        onSelect={onSelect}
                        commands={commands.getInputCommands(column)}
                        onContextMenu={onContextMenu}
                    />
                );
            })}
        </tr>
    );
}
