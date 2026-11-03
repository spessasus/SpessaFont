import {
    BasicInstrument,
    BasicInstrumentZone,
    type BasicPreset,
    type BasicPresetZone
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
import { getObjectId } from "../utils/object_id.ts";
import type { ZoneColumn } from "./zone_columns.ts";

type HeaderColumn = ZoneColumn<BasicPresetZone | BasicInstrumentZone>;

interface GeneratorTableHeaderProps {
    element: BasicInstrument | BasicPreset;
    columns: readonly HeaderColumn[];
}

export function GeneratorTableHeader({
    element,
    columns
}: GeneratorTableHeaderProps) {
    const { t } = useTranslation();
    const { session, apply, setView } = useBankEditor();
    const { openMenu } = useContextMenu();
    const { pickElement } = useDialogs();

    const deleteColumn = ({ zone, linkedZone }: HeaderColumn) => {
        const actions = [new DeleteZoneAction(element, zone)];
        if (linkedZone) {
            actions.push(new DeleteZoneAction(element, linkedZone));
        }
        apply(actions);
    };

    const replaceColumn = async ({ zone, linkedZone, name }: HeaderColumn) => {
        const { document } = session;
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
            !(zone instanceof BasicInstrumentZone)
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

    const openColumn = ({ zone }: HeaderColumn) =>
        setView(
            zone instanceof BasicInstrumentZone ? zone.sample : zone.instrument
        );
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
                {element.name}
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
                        key={getObjectId(zone)}
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
