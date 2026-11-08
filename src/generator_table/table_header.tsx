import { BasicInstrument, type BasicPreset } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import "./header_cell.css";
import "./header_cell_phone.css";
import { ZoneHeaderLabel } from "./zone_header_label.tsx";
import { ZoneStepper } from "./zone_stepper.tsx";
import { useLayout } from "../layout/layout_context.ts";
import type { ZoneView } from "../core_backend/entity_views.ts";
import { useContextMenu } from "../context_menu/context_menu_context.ts";
import type { ZoneColumn } from "./zone_columns.ts";
import type { MouseEvent } from "react";
import { formatKeyRange, getColumnKeyRange } from "./zone_finder.ts";
import { MENU_ICON_NAMES } from "../context_menu/menu_icon_name.ts";
import { ChevronDownIcon } from "../utils/icons/app_icons.tsx";
import { getZoneHeaderEntries, useZoneCommands } from "./use_zone_commands.ts";
import {
    ADD_ZONE_KEY,
    getZoneDeleteKey,
    getZoneNameKey
} from "./table_navigation.ts";

interface TableHeaderProps {
    /**
     * The edited element, for the actions.
     */
    element: BasicInstrument | BasicPreset;
    name: string;
    columns: readonly ZoneColumn[];
    /**
     * The element's global zone, whose key range an instrument zone inherits.
     */
    globalZone: ZoneView;
    /**
     * The key of the table's Tab stop when it is in this row.
     */
    activeKey: string | undefined;
    /**
     * Opens the modulator editor of a zone, from the phone zone header sheet.
     */
    onEditModulators: (zoneId: number) => void;
    /**
     * Opens the phone's Zones sheet from the corner cell.
     */
    onOpenZoneList: () => void;
    /**
     * Set in the phone's One zone mode, where `columns` holds the shown zone only.
     */
    oneZone?: {
        index: number;
        count: number;
        onStep: (direction: 1 | -1) => void;
    };
}

export function TableHeader({
    element,
    name: elementName,
    columns,
    globalZone,
    activeKey,
    onEditModulators,
    onOpenZoneList,
    oneZone
}: TableHeaderProps) {
    const { t } = useTranslation();
    const layout = useLayout();
    const { openMenu } = useContextMenu();
    const commands = useZoneCommands(element);
    const getTabIndex = (key: string) => (key === activeKey ? 0 : -1);
    const getRangeText = (column: ZoneColumn) =>
        formatKeyRange(getColumnKeyRange(column, globalZone));

    // The phone sheet for a tap or long press on a zone header, with Modulators added
    const openZoneSheet = (e: MouseEvent, column: ZoneColumn) =>
        openMenu(
            e,
            getZoneHeaderEntries(commands.getMenuEntries(column), {
                label: t("phoneLocale.zoneHeader.modulators", {
                    count: column.zone.modulators.length
                }),
                icon: MENU_ICON_NAMES.edit,
                hasSubmenu: true,
                onSelect: () => onEditModulators(column.zone.id)
            }),
            {
                title: t("phoneLocale.zoneHeader.title", {
                    name: column.name,
                    range: getRangeText(column)
                })
            }
        );

    return (
        <tr className={"generator_table_header_row"}>
            <th
                scope={"col"}
                className={
                    "header_cell " +
                    (element instanceof BasicInstrument
                        ? "instrument"
                        : "preset")
                }
            >
                {layout === "phone" ? (
                    <button
                        type={"button"}
                        className={"plain_button zone_list_button"}
                        data-grid-key={ADD_ZONE_KEY}
                        tabIndex={getTabIndex(ADD_ZONE_KEY)}
                        onClick={onOpenZoneList}
                    >
                        {t("phoneLocale.grid.zones", {
                            count: oneZone?.count ?? columns.length
                        })}
                        <span aria-hidden={"true"}>
                            <ChevronDownIcon />
                        </span>
                    </button>
                ) : (
                    <span className={"header_cell_title"}>
                        {elementName}
                        <button
                            type={"button"}
                            className={"plain_button add_zone"}
                            data-grid-key={ADD_ZONE_KEY}
                            tabIndex={getTabIndex(ADD_ZONE_KEY)}
                            aria-label={t("soundBankLocale.createNewZone")}
                            title={t("soundBankLocale.createNewZone")}
                            onClick={() => void commands.add()}
                        >
                            +
                        </button>
                    </span>
                )}
            </th>
            <th scope={"col"} className={"header_cell"}>
                {t("soundBankLocale.globalZone")}
            </th>
            {columns.map((column, index) => {
                const { zone, name, isStereo } = column;
                const zoneLabel = t("soundBankLocale.deleteZone", { name });
                const keyRange =
                    element instanceof BasicInstrument
                        ? getRangeText(column)
                        : undefined;
                return (
                    <th
                        scope={"col"}
                        colSpan={column.colSpan}
                        className={"header_cell " + (isStereo ? "stereo" : "")}
                        key={zone.id}
                        // The name button inside gets the keyboard menu key
                        onContextMenu={
                            layout === "phone"
                                ? (e) => openZoneSheet(e, column)
                                : (e) =>
                                      openMenu(
                                          e,
                                          commands.getMenuEntries(column)
                                      )
                        }
                    >
                        {oneZone ? (
                            <ZoneStepper
                                column={column}
                                keyRange={keyRange}
                                index={oneZone.index}
                                count={oneZone.count}
                                tabIndex={getTabIndex(getZoneNameKey(zone.id))}
                                onStep={oneZone.onStep}
                                onOpen={(e) => openZoneSheet(e, column)}
                            />
                        ) : (
                            <button
                                type={"button"}
                                className={"plain_button header_cell_name"}
                                data-grid-key={getZoneNameKey(zone.id)}
                                tabIndex={getTabIndex(getZoneNameKey(zone.id))}
                                title={
                                    isStereo && layout !== "phone"
                                        ? t(
                                              "soundBankLocale.thisIsAStereoSamplePair"
                                          )
                                        : undefined
                                }
                                onClick={
                                    layout === "phone"
                                        ? (e) => openZoneSheet(e, column)
                                        : () => commands.open(column)
                                }
                            >
                                {layout === "phone" ? (
                                    <ZoneHeaderLabel
                                        name={name}
                                        keyRange={keyRange}
                                        isStereo={isStereo}
                                        colorIndex={index}
                                    />
                                ) : (
                                    name
                                )}
                            </button>
                        )}
                        <button
                            type={"button"}
                            className={"plain_button delete_zone"}
                            data-grid-key={getZoneDeleteKey(zone.id)}
                            tabIndex={getTabIndex(getZoneDeleteKey(zone.id))}
                            aria-label={zoneLabel}
                            title={zoneLabel}
                            onClick={() => commands.remove(column)}
                        >
                            ✖
                        </button>
                    </th>
                );
            })}
        </tr>
    );
}
