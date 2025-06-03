import type { Modulator } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { ModulatorList } from "../modulator_editing/modulator_list/modulator_list.tsx";
import { useState } from "react";
import type Manager from "../core_backend/manager.ts";

export function DefaultModulatorList({ manager }: { manager: Manager }) {
    const [dmods, setDmods] = useState(manager.bank?.defaultModulators);

    const { t } = useTranslation();
    if (dmods === undefined) {
        return <></>;
    }
    const setDefaultModulators = (mods: Modulator[]) => {
        if (manager.bank === undefined) {
            return;
        }
        manager.bank.defaultModulators = mods;
        manager.clearCache();
        setDmods(mods);
    };

    return (
        <div className={"default_modulators"}>
            <h2>{t("bankInfo.defaultModulators")}</h2>
            <ModulatorList
                modulatorList={dmods}
                setModulatorList={setDefaultModulators}
            ></ModulatorList>
        </div>
    );
}
