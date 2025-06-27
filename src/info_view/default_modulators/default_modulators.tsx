import { Modulator } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { ModulatorList } from "../../modulator_editing/modulator_list/modulator_list.tsx";
import { type JSX, useState } from "react";
import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";
import type { ClipboardManager } from "../../core_backend/clipboard_manager.ts";
import { SetDefaultModulators } from "./set_default_modulators.tsx";

export function DefaultModulatorList({
    manager,
    clipboard,
    ccOptions,
    destinationOptions
}: {
    manager: SoundBankManager;
    clipboard: ClipboardManager;
    ccOptions: JSX.Element;
    destinationOptions: JSX.Element;
}) {
    const [dmods, setDmods] = useState(manager?.defaultModulators);

    const { t } = useTranslation();
    if (dmods === undefined) {
        return <></>;
    }
    const setDefaultModulators = (mods: Modulator[]) => {
        if (manager === undefined) {
            return;
        }
        manager.modifyBank([
            new SetDefaultModulators(
                setDmods,
                [...mods],
                [...manager.defaultModulators]
            )
        ]);
    };

    return (
        <div className={"default_modulators"}>
            <h2 className={"default_modulators_title"}>
                {t("bankInfo.defaultModulatorsFor")}{" "}
                <i>{manager.getBankName(t("bankInfo.unnamed"))}</i>:
            </h2>
            <ModulatorList
                destinationOptions={destinationOptions}
                ccOptions={ccOptions}
                clipboardManager={clipboard}
                modulatorList={dmods}
                setModulatorList={setDefaultModulators}
            ></ModulatorList>
        </div>
    );
}
