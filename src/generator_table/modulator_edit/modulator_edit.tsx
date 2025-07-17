import { type BasicZone, Modulator } from "spessasynth_core";
import {
    ModulatorList,
    type ModulatorListGlobals
} from "../../modulator_editing/modulator_list/modulator_list.tsx";
import "./modulator_edit.css";
import { useTranslation } from "react-i18next";
import { useCallback } from "react";
import { EditModulatorsAction } from "./edit_modulators_action.ts";
import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";

export function ModulatorEditor({
    name,
    zone,
    clipboardManager,
    ccOptions,
    destinationOptions,
    onClose,
    callback,
    manager,
    linkedZone,
    defaultModulators
}: {
    name: string;
    zone: BasicZone;
    linkedZone: BasicZone | undefined;
    onClose: () => unknown;
    callback: () => unknown;
    manager: SoundBankManager;
    defaultModulators: Modulator[];
} & ModulatorListGlobals) {
    const { t } = useTranslation();

    const setModulators = useCallback(
        (mods: Modulator[]) => {
            const actions = [new EditModulatorsAction(zone, mods, callback)];
            // linked sample
            if (linkedZone) {
                actions.push(
                    new EditModulatorsAction(linkedZone, mods, callback)
                );
            }
            manager.modifyBank(actions);
        },
        [callback, linkedZone, manager, zone]
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
                clipboardManager={clipboardManager}
                ccOptions={ccOptions}
                destinationOptions={destinationOptions}
                defaultModulators={defaultModulators}
            />
        </div>
    );
}
