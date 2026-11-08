import { BasicInstrument, type BasicPreset } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import "./header_cell.css";
import "./header_cell_phone.css";
import { ZoneHeaderLabel } from "./zone_header_label.tsx";
import { useLayout } from "../layout/layout_context.ts";
import type { ZoneView } from "../core_backend/entity_views.ts";
import { useContextMenu } from "../context_menu/context_menu_context.ts";
import type { ZoneColumn } from "./zone_columns.ts";
import { useZoneCommands } from "./use_zone_commands.ts";
import {
    ADD_ZONE_KEY,
    getZoneDeleteKey,
    getZoneNameKey
} from "./table_navigation.ts";

// An instrument zone with no key range plays the whole keyboard
const FULL_RANGE = { min: 0, max: 127 };

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
}

export function TableHeader({
    element,
    name: elementName,
    columns,
    globalZone,
    activeKey
}: TableHeaderProps) {
    const { t } = useTranslation();
    const layout = useLayout();
    const { openMenu } = useContextMenu();
    const commands = useZoneCommands(element);
    const getTabIndex = (key: string) => (key === activeKey ? 0 : -1);

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
            </th>
            <th scope={"col"} className={"header_cell"}>
                {t("soundBankLocale.globalZone")}
            </th>
            {columns.map((column, index) => {
                const { zone, name, isStereo } = column;
                const range =
                    zone.keyRange ?? globalZone.keyRange ?? FULL_RANGE;
                const zoneLabel = t("soundBankLocale.deleteZone", { name });
                return (
                    <th
                        scope={"col"}
                        colSpan={column.colSpan}
                        className={"header_cell " + (isStereo ? "stereo" : "")}
                        key={zone.id}
                        // The name button inside gets the keyboard menu key
                        onContextMenu={(e) =>
                            openMenu(e, commands.getMenuEntries(column))
                        }
                    >
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
                            onClick={() => commands.open(column)}
                        >
                            {layout === "phone" ? (
                                <ZoneHeaderLabel
                                    name={name}
                                    keyRange={
                                        element instanceof BasicInstrument
                                            ? `${range.min}-${range.max}`
                                            : undefined
                                    }
                                    isStereo={isStereo}
                                    colorIndex={index}
                                />
                            ) : (
                                name
                            )}
                        </button>
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
