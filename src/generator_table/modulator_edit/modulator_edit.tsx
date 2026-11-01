import type {
    BasicInstrument,
    BasicPreset,
    BasicZone,
    Modulator
} from "spessasynth_core";
import {
    ModulatorList,
    type ModulatorListGlobals
} from "../../modulator_editing/modulator_list/modulator_list.tsx";
import "./modulator_edit.css";
import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import { EditModulatorsAction } from "./edit_modulators_action.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";

export function ModulatorEditor({
    name,
    zone,
    ccOptions,
    destinationOptions,
    onClose,
    element,
    linkedZone,
    defaultModulators
}: {
    name: string;
    zone: BasicZone;
    linkedZone: BasicZone | undefined;
    onClose: () => unknown;
    element: BasicPreset | BasicInstrument;
    defaultModulators: readonly Modulator[];
} & ModulatorListGlobals) {
    const { t } = useTranslation();
    const { apply } = useBankEditor();

    const setModulators = useCallback(
        (mods: Modulator[]) => {
            const actions = [new EditModulatorsAction(element, zone, mods)];
            // linked sample
            if (linkedZone) {
                actions.push(
                    new EditModulatorsAction(element, linkedZone, mods)
                );
            }
            apply(actions);
        },
        [apply, element, linkedZone, zone]
    );

    return (
        <div className={"zone_modulators"}>
            <h2>
                {t("modulatorLocale.editingModulators", {
                    name
                })}
            </h2>
            <h1 onClick={onClose} className={"close"}>
                &times;
            </h1>
            <ModulatorList
                modulatorList={zone.modulators}
                setModulatorList={setModulators}
                ccOptions={ccOptions}
                destinationOptions={destinationOptions}
                defaultModulators={defaultModulators}
            />
        </div>
    );
}
