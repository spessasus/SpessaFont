import {
    type BasicInstrument,
    type BasicPreset,
    Modulator
} from "spessasynth_core";
import { ModulatorList } from "../../modulator_editing/modulator_list/modulator_list.tsx";
import "./modulator_edit.css";
import { useTranslation } from "react-i18next";
import { EditModulatorsAction } from "./edit_modulators_action.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import type { ModulatorView } from "../../core_backend/entity_views.ts";
import type { ZoneColumn } from "../zone_columns.ts";
import { findZone, getColumnZones } from "../cell/column_zones.ts";
import { useLayout } from "../../layout/layout_context.ts";
import { ModulatorLayerHeader } from "./modulator_layer_header.tsx";
import { useBankSnapshot } from "../../hooks/use_bank_snapshot.ts";
import { useSFESwitch } from "../../hooks/use_sfe_switch.ts";
import { isSFEGenerator } from "../../core_backend/sfe_data.ts";

interface ModulatorEditorProps {
    name: string;
    column: ZoneColumn;
    onClose: () => void;
    /**
     * The edited element, for the actions.
     */
    element: BasicPreset | BasicInstrument;
    defaultModulators: readonly ModulatorView[];
}

export function ModulatorEditor({
    name,
    column,
    onClose,
    element,
    defaultModulators
}: ModulatorEditorProps) {
    const { t } = useTranslation();
    const { session, apply } = useBankEditor();
    const layout = useLayout();
    const isSFE = useBankSnapshot(session.store, (s) => s.format === "sfe");
    const applyWithSFESwitch = useSFESwitch();
    const getModulators = () =>
        findZone(element, column.zone.id)?.modulators ?? [];

    // A column has a stereo partner only while both zones have the same modulators (the
    // table splits the pair otherwise), so the partner gets copies of the same list
    const setModulators = (mods: Modulator[], mergeKey?: string) => {
        const before = getModulators();
        // Only a paste brings one in, SF2 mode offers no SFE destination
        const isAddingSFEData = mods.some(
            (m) => isSFEGenerator(m.destination) && !before.includes(m)
        );
        applyWithSFESwitch(
            session,
            getColumnZones(element, column).map(
                ({ zone }, i) =>
                    new EditModulatorsAction(
                        element,
                        zone,
                        i === 0 ? mods : mods.map((m) => Modulator.copyFrom(m))
                    )
            ),
            isAddingSFEData,
            (group) => apply(group, mergeKey)
        );
    };

    return (
        <div className={"zone_modulators"}>
            {layout === "phone" ? null : (
                <>
                    <h2>
                        {t("modulatorLocale.editingModulators", {
                            name
                        })}
                    </h2>
                    <button
                        type={"button"}
                        // The table and the button that opened the editor are gone
                        autoFocus
                        onClick={onClose}
                        className={"plain_button close"}
                        aria-label={t("modulatorLocale.closeEditor")}
                        title={t("modulatorLocale.closeEditor")}
                    >
                        &times;
                    </button>
                </>
            )}
            <ModulatorList
                modulatorList={column.zone.modulators}
                getModulators={getModulators}
                onModulatorListChange={setModulators}
                isSFE={isSFE}
                defaultModulators={defaultModulators}
                renderHeader={
                    layout === "phone"
                        ? (newButton) => (
                              <ModulatorLayerHeader
                                  title={t("phoneLocale.modulators.title", {
                                      zone: name
                                  })}
                                  onBack={onClose}
                              >
                                  {newButton}
                              </ModulatorLayerHeader>
                          )
                        : undefined
                }
            />
        </div>
    );
}
