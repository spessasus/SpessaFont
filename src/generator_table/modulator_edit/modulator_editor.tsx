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
    const { apply } = useBankEditor();

    // A column has a stereo partner only while both zones have the same modulators (the
    // table splits the pair otherwise), so the partner gets copies of the same list
    const setModulators = (mods: Modulator[]) =>
        apply(
            getColumnZones(element, column).map(
                ({ zone }, i) =>
                    new EditModulatorsAction(
                        element,
                        zone,
                        i === 0 ? mods : mods.map((m) => Modulator.copyFrom(m))
                    )
            )
        );

    return (
        <div className={"zone_modulators"}>
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
            <ModulatorList
                modulatorList={column.zone.modulators}
                getModulators={() =>
                    findZone(element, column.zone.id)?.modulators ?? []
                }
                onModulatorListChange={setModulators}
                defaultModulators={defaultModulators}
            />
        </div>
    );
}
