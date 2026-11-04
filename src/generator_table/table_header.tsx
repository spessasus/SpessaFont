import {
    BasicInstrument,
    BasicInstrumentZone,
    type BasicPreset,
    BasicPresetZone
} from "spessasynth_core";
import { useTranslation } from "react-i18next";
import "./header_cell.css";
import { DeleteZoneAction } from "./delete_zone_action.ts";
import {
    createReplaceSampleActions,
    ReplaceZoneChildAction
} from "./replace_zone_child_action.ts";
import { useContextMenu } from "../context_menu/context_menu_context.ts";
import { useDialogs } from "../dialogs/dialogs_context.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useEntityLookup } from "../hooks/use_entity_lookup.ts";
import type { ZoneColumn } from "./zone_columns.ts";
import { findZone } from "./cell/column_zones.ts";

interface GeneratorTableHeaderProps {
    /**
     * The edited element, for the actions.
     */
    element: BasicInstrument | BasicPreset;
    name: string;
    columns: readonly ZoneColumn[];
}

export function GeneratorTableHeader({
    element,
    name: elementName,
    columns
}: GeneratorTableHeaderProps) {
    const { t } = useTranslation();
    const { session, apply, setView } = useBankEditor();
    const lookup = useEntityLookup(session.store);
    const { openMenu } = useContextMenu();
    const { pickElement } = useDialogs();

    // The zones of a column, found when an edit needs them
    const getZones = (column: ZoneColumn) => {
        const zone = findZone(element, column.zone.id);
        const linkedZone = column.linkedZone
            ? findZone(element, column.linkedZone.id)
            : undefined;
        return { zone, linkedZone };
    };

    const deleteColumn = (column: ZoneColumn) => {
        const { zone, linkedZone } = getZones(column);
        if (
            !(zone instanceof BasicInstrumentZone) &&
            !(zone instanceof BasicPresetZone)
        ) {
            return;
        }
        const actions = [new DeleteZoneAction(element, zone)];
        if (
            linkedZone instanceof BasicInstrumentZone ||
            linkedZone instanceof BasicPresetZone
        ) {
            actions.push(new DeleteZoneAction(element, linkedZone));
        }
        apply(actions);
    };

    const replaceColumn = async (column: ZoneColumn) => {
        const { document } = session;
        const { name } = column;
        const { zone, linkedZone } = getZones(column);
        if (
            element instanceof BasicInstrument &&
            zone instanceof BasicInstrumentZone
        ) {
            const picked = await pickElement({
                title: t("contextMenu.pickSample", { name }),
                items: document.samples,
                getLabel: (s) => s.name
            });
            if (picked) {
                apply(
                    createReplaceSampleActions(
                        element,
                        zone,
                        linkedZone instanceof BasicInstrumentZone
                            ? linkedZone
                            : undefined,
                        picked
                    )
                );
            }
        } else if (
            !(element instanceof BasicInstrument) &&
            zone instanceof BasicPresetZone
        ) {
            const picked = await pickElement({
                title: t("contextMenu.pickReplacementInstrument", { name }),
                items: document.instruments,
                getLabel: (i) => i.name
            });
            if (picked) {
                apply([new ReplaceZoneChildAction(element, zone, picked)]);
            }
        }
    };

    const openColumn = ({ zone }: ZoneColumn) => {
        if (zone.childId === undefined) {
            return;
        }
        const child =
            element instanceof BasicInstrument
                ? lookup.sample(zone.childId)
                : lookup.instrument(zone.childId);
        if (child) {
            setView(child);
        }
    };
    return (
        <tr className={"header_row"}>
            <th
                scope={"col"}
                className={
                    "header_cell " +
                    (element instanceof BasicInstrument
                        ? "instrument"
                        : "preset")
                }
            >
                {elementName}
            </th>
            <th scope={"col"} className={"header_cell"}>
                {t("soundBankLocale.globalZone")}
            </th>
            {columns.map((column) => {
                const { zone, name, isStereo } = column;
                const zoneLabel = t("soundBankLocale.deleteZone", { name });
                return (
                    <th
                        scope={"col"}
                        colSpan={column.colSpan}
                        className={"header_cell " + (isStereo ? "stereo" : "")}
                        key={zone.id}
                        // The name button inside gets the keyboard menu key
                        onContextMenu={(e) =>
                            openMenu(e, [
                                {
                                    label: t("contextMenu.open"),
                                    onSelect: () => openColumn(column)
                                },
                                {
                                    label:
                                        element instanceof BasicInstrument
                                            ? t("contextMenu.replaceSample")
                                            : t(
                                                  "contextMenu.replaceInstrument"
                                              ),
                                    onSelect: () => void replaceColumn(column)
                                },
                                "separator",
                                {
                                    label: t("contextMenu.deleteZone"),
                                    onSelect: () => deleteColumn(column)
                                }
                            ])
                        }
                    >
                        <button
                            type={"button"}
                            className={"plain_button header_cell_name"}
                            title={
                                isStereo
                                    ? t(
                                          "soundBankLocale.thisIsAStereoSamplePair"
                                      )
                                    : undefined
                            }
                            onClick={() => openColumn(column)}
                        >
                            {name}
                        </button>
                        <button
                            type={"button"}
                            className={"plain_button delete_zone"}
                            aria-label={zoneLabel}
                            title={zoneLabel}
                            onClick={() => deleteColumn(column)}
                        >
                            ✖
                        </button>
                    </th>
                );
            })}
        </tr>
    );
}
