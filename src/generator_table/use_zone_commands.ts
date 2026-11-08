import {
    BasicInstrument,
    BasicInstrumentZone,
    type BasicPreset,
    BasicPresetZone
} from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { DeleteZoneAction } from "./delete_zone_action.ts";
import {
    createReplaceSampleActions,
    ReplaceZoneChildAction
} from "./replace_zone_child_action.ts";
import type {
    ContextMenuEntry,
    ContextMenuItem
} from "../context_menu/context_menu_context.ts";
import { MENU_ICON_NAMES } from "../context_menu/menu_icon_name.ts";
import { useDialogs } from "../dialogs/dialogs_context.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useEntityLookup } from "../hooks/use_entity_lookup.ts";
import type { ZoneColumn } from "./zone_columns.ts";
import { findZone } from "./cell/column_zones.ts";
import { useElementTools } from "./tools/use_element_tools.tsx";
import { CreateZoneAction } from "./create_zone_action.ts";
import {
    createInstrumentLinkActions,
    createSampleLinkActions
} from "../menu_list/link_actions.ts";
import {
    findGridItem,
    focusNeighborColumn,
    getZoneDeleteKey
} from "./table_navigation.ts";

/**
 * The phone zone header sheet's entries: the menu entries with Modulators added to the group
 * before Delete.
 */
export function getZoneHeaderEntries(
    entries: readonly ContextMenuEntry[],
    modulators: ContextMenuItem
) {
    const index = entries.lastIndexOf("separator");
    return index === -1
        ? [...entries, modulators]
        : entries.toSpliced(index, 0, modulators);
}

/**
 * The commands of a zone column (open, replace, duplicate, split, remove) and of the table's
 * Add zone, shared by the desktop header menu and the phone zone header sheet.
 */
export function useZoneCommands(element: BasicInstrument | BasicPreset) {
    const { t } = useTranslation();
    const { session, apply, setView } = useBankEditor();
    const lookup = useEntityLookup(session.store);
    const { pickElement } = useDialogs();
    const tools = useElementTools();

    // The zones of a column, found when an edit needs them
    const getZones = (column: ZoneColumn) => {
        const zone = findZone(element, column.zone.id);
        const linkedZone = column.linkedZone
            ? findZone(element, column.linkedZone.id)
            : undefined;
        return { zone, linkedZone };
    };

    // The zones of a column for splitting, both of a stereo pair
    const getSplitZones = (column: ZoneColumn) => {
        const zones = new Set<BasicPresetZone | BasicInstrumentZone>();
        const { zone: own, linkedZone } = getZones(column);
        for (const zone of [own, linkedZone]) {
            if (
                zone instanceof BasicInstrumentZone ||
                zone instanceof BasicPresetZone
            ) {
                zones.add(zone);
            }
        }
        return zones;
    };

    const remove = (column: ZoneColumn) => {
        const { zone, linkedZone } = getZones(column);
        if (
            !(zone instanceof BasicInstrumentZone) &&
            !(zone instanceof BasicPresetZone)
        ) {
            return;
        }
        // The column's buttons go away with it, so the focus moves to the next column first
        const focused = document.activeElement;
        if (
            focused instanceof HTMLElement &&
            findGridItem(
                focused.closest("th"),
                getZoneDeleteKey(column.zone.id)
            )
        ) {
            focusNeighborColumn(focused);
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

    const replace = async (column: ZoneColumn) => {
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

    // A copy of each zone of the column, with its generators and modulators
    const duplicate = (column: ZoneColumn) => {
        apply(
            [...getSplitZones(column)].map(
                (zone) =>
                    new CreateZoneAction(
                        element,
                        zone,
                        zone instanceof BasicInstrumentZone
                            ? zone.sample
                            : zone.instrument
                    )
            )
        );
    };

    const add = async () => {
        const { document } = session;
        if (element instanceof BasicInstrument) {
            const picked = await pickElement({
                title: t("soundBankLocale.pickZoneSample"),
                items: document.samples,
                getLabel: (s) => s.name
            });
            if (picked) apply(createSampleLinkActions(element, [picked]));
            return;
        }
        const picked = await pickElement({
            title: t("soundBankLocale.pickZoneInstrument"),
            items: document.instruments,
            getLabel: (i) => i.name
        });
        if (picked) apply(createInstrumentLinkActions(element, [picked]));
    };

    const open = ({ zone }: ZoneColumn) => {
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

    const splitByKey = (column: ZoneColumn) =>
        tools.split([element], { mode: "key", step: 1 }, getSplitZones(column));

    const splitByVelocity = (column: ZoneColumn) =>
        void tools.openSplitZones([element], "velocity", getSplitZones(column));

    // The desktop right-click menu, and the phone sheet's entries
    const getMenuEntries = (column: ZoneColumn): ContextMenuEntry[] => {
        const isInstrument = element instanceof BasicInstrument;
        const { name } = column;
        return [
            {
                label: t("contextMenu.open"),
                icon: MENU_ICON_NAMES.open,
                description: t(
                    isInstrument
                        ? "phoneLocale.zoneHeader.openSample"
                        : "phoneLocale.zoneHeader.openInstrument",
                    { name }
                ),
                onSelect: () => open(column)
            },
            {
                label: isInstrument
                    ? t("contextMenu.replaceSample")
                    : t("contextMenu.replaceInstrument"),
                icon: MENU_ICON_NAMES.link,
                description: t(
                    isInstrument
                        ? "phoneLocale.zoneHeader.replaceSample"
                        : "phoneLocale.zoneHeader.replaceInstrument"
                ),
                onSelect: () => void replace(column)
            },
            {
                label: t("contextMenu.duplicateZone"),
                icon: MENU_ICON_NAMES.duplicate,
                onSelect: () => duplicate(column)
            },
            "separator",
            {
                label: t("toolsLocale.split.byKeyMenu"),
                icon: MENU_ICON_NAMES.cut,
                onSelect: () => splitByKey(column)
            },
            {
                label: t("toolsLocale.split.byVelocityMenu"),
                icon: MENU_ICON_NAMES.cut,
                onSelect: () => splitByVelocity(column)
            },
            "separator",
            {
                label: t("contextMenu.deleteZone"),
                icon: MENU_ICON_NAMES.delete,
                isDestructive: true,
                onSelect: () => remove(column)
            }
        ];
    };

    return {
        open,
        replace,
        duplicate,
        splitByKey,
        splitByVelocity,
        remove,
        add,
        getMenuEntries
    };
}
