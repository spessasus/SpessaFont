import { BasicInstrument, type BasicPreset } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import { useBankSnapshot } from "../../hooks/use_bank_snapshot.ts";
import { getObjectId } from "../../utils/object_id.ts";
import { ToolsMenu } from "../../menu_bar/tools_menu.tsx";
import { MenuBarIcon } from "../../menu_bar/menu_bar_icon.tsx";
import { EditIcon } from "../../utils/icons/edit_icons.tsx";
import { useElementTools } from "./use_element_tools.tsx";

interface ZoneToolsMenuProps {
    element: BasicPreset | BasicInstrument;
}

/**
 * The "Preset Tools" or "Instrument Tools" menu for the shown element.
 */
export function ZoneToolsMenu({ element }: ZoneToolsMenuProps) {
    const { t } = useTranslation();
    const { session } = useBankEditor();
    const tools = useElementTools();
    const isInstrument = element instanceof BasicInstrument;
    const id = getObjectId(element);
    const zoneCount = useBankSnapshot(
        session.store,
        (s) =>
            (isInstrument ? s.views.instruments : s.views.presets).get(id)
                ?.zones.length ?? 0
    );
    const hasZones = zoneCount > 0;

    return (
        <ToolsMenu
            title={
                isInstrument
                    ? t("menuBarLocale.tools.instrument")
                    : t("menuBarLocale.tools.preset")
            }
        >
            <MenuBarIcon
                text={t("toolsLocale.keyCurve.menu")}
                isDisabled={!hasZones}
                onClick={() => void tools.openKeyCurve([element])}
            >
                <EditIcon />
            </MenuBarIcon>
            <MenuBarIcon
                text={t("toolsLocale.attenuation.menu")}
                isDisabled={!hasZones}
                onClick={() => void tools.openAttenuation([element])}
            >
                <EditIcon />
            </MenuBarIcon>
            <MenuBarIcon
                text={t("toolsLocale.split.menu")}
                isDisabled={!hasZones}
                onClick={() => void tools.openSplitZones([element])}
            >
                <EditIcon />
            </MenuBarIcon>
            {isInstrument ? (
                <>
                    <MenuBarIcon
                        text={t("toolsLocale.naturalRelease.menu")}
                        isDisabled={!hasZones}
                        onClick={() => void tools.openNaturalRelease([element])}
                    >
                        <EditIcon />
                    </MenuBarIcon>
                    <MenuBarIcon
                        text={t("contextMenu.spreadSamples")}
                        isDisabled={zoneCount < 2}
                        onClick={() => tools.spread([element])}
                    >
                        <EditIcon />
                    </MenuBarIcon>
                    <MenuBarIcon
                        text={t("contextMenu.drumMap")}
                        isDisabled={!hasZones}
                        onClick={() => void tools.openDrumMap([element])}
                    >
                        <EditIcon />
                    </MenuBarIcon>
                </>
            ) : null}
        </ToolsMenu>
    );
}
