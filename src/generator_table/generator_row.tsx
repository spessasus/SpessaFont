import "./cell/generator_cell.css";
import "./cell/generator_cell_phone.css";
import { useLayout } from "../layout/layout_context.ts";
import type * as React from "react";
import { useMemo } from "react";
import { BasicInstrument, type BasicPreset } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { generatorLocaleMap } from "../utils/translated_options/generator_to_locale_map.ts";
import type { GeneratorRowType } from "./generator_row_type.ts";
import type { ZoneColumn } from "./zone_columns.ts";
import type { ZoneView } from "../core_backend/entity_views.ts";
import { GENERATOR_UNITS } from "./generator_unit.ts";
import { useCellCommands } from "./cell/use_cell_commands.ts";
import { getGeneratorOptions } from "./generator_options.ts";
import { getCellDisplay, getGlobalCellValue } from "./cell/cell_values.ts";
import { getCellKey } from "./table_navigation.ts";
import {
    type ContextMenuEntry,
    useContextMenu
} from "../context_menu/context_menu_context.ts";
import { useLatest } from "./cell/use_latest.ts";
import {
    GeneratorRowCell,
    type RowCellHandlers
} from "./generator_row_cell.tsx";

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
    const isInstrument = element instanceof BasicInstrument;
    const selectedColumns = columns.filter((c) =>
        selectedZoneIds.has(c.zone.id)
    );
    const commands = useCellCommands(element, row, columns, selectedColumns);
    // The cells get one handler object that keeps its identity, so a commit renders only the
    // cells whose views changed. The handlers read what is current when they run.
    const latest = useLatest({
        columns,
        globalZone,
        commands,
        onSelectCell,
        openMenu,
        t,
        name
    });
    const handlers = useMemo<RowCellHandlers>(() => {
        const findColumn = (zoneId: number) =>
            latest.current.columns.find((c) => c.zone.id === zoneId);
        return {
            select: (zoneId, event) => {
                latest.current.onSelectCell(zoneId, event);
            },
            openMenu: (zoneId, event) => {
                const column = findColumn(zoneId);
                if (!column) {
                    return;
                }
                const current = latest.current;
                current.openMenu(
                    event,
                    current.commands.getMenuEntries(column),
                    {
                        title: current.t("soundBankLocale.cellLabel", {
                            generator: current.name,
                            zone: column.name
                        })
                    }
                );
            },
            commitText: (zoneId, text) => {
                const column = findColumn(zoneId);
                if (!column) {
                    return true;
                }
                const { commands: current, globalZone: global } =
                    latest.current;
                const shownText = getCellDisplay(
                    { row, isInstrument },
                    column,
                    global
                ).text;
                return current.didCommitText(column, text, shownText);
            },
            pick: (zoneId, value) => {
                const column = findColumn(zoneId);
                if (column) {
                    latest.current.commands.pick(column, value);
                }
            },
            selectKeyDown: (zoneId, event) => {
                const column = findColumn(zoneId);
                if (column) {
                    latest.current.commands.handleSelectKeyDown(event, column);
                }
            },
            copy: (zoneId) => {
                const column = findColumn(zoneId);
                return column
                    ? latest.current.commands.getInputCommands(column).copy()
                    : "";
            },
            cut: (zoneId) => {
                const column = findColumn(zoneId);
                return column
                    ? latest.current.commands.getInputCommands(column).cut()
                    : "";
            },
            paste: (zoneId, text) => {
                const column = findColumn(zoneId);
                if (column) {
                    latest.current.commands
                        .getInputCommands(column)
                        .paste(text);
                }
            },
            clear: (zoneId) => {
                const column = findColumn(zoneId);
                if (column) {
                    latest.current.commands.getInputCommands(column).clear();
                }
            },
            nudge: (zoneId, direction, steps) => {
                const column = findColumn(zoneId);
                if (column) {
                    latest.current.commands
                        .getInputCommands(column)
                        .nudge(direction, steps);
                }
            }
        };
    }, [latest, row, isInstrument]);
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
            {columns.map((column) => (
                <GeneratorRowCell
                    key={column.zone.id}
                    row={row}
                    isInstrument={isInstrument}
                    generatorName={name}
                    options={options}
                    zone={column.zone}
                    linkedZone={column.linkedZone}
                    sample={column.sample}
                    linkedSample={column.linkedSample}
                    name={column.name}
                    colSpan={column.colSpan}
                    isStereo={column.isStereo}
                    globalValue={getGlobalCellValue(row, globalZone, column)}
                    isSelected={selectedZoneIds.has(column.zone.id)}
                    isActive={
                        activeKey === getCellKey(generator, column.zone.id)
                    }
                    t={t}
                    handlers={handlers}
                />
            ))}
        </tr>
    );
}
