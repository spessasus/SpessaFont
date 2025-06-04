import { type BasicSoundBank, Modulator } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { ModulatorList } from "../modulator_editing/modulator_list/modulator_list.tsx";
import { useState } from "react";
import type Manager from "../core_backend/manager.ts";
import type { HistoryAction } from "../core_backend/history.ts";

class SetDefaultModulators implements HistoryAction {
    setDmods: (d: Modulator[]) => void;
    oldVal: Modulator[];
    newVal: Modulator[];

    constructor(
        setDmods: (d: Modulator[]) => void,
        newVal: Modulator[],
        oldVal: Modulator[]
    ) {
        this.setDmods = setDmods;
        this.oldVal = oldVal;
        this.newVal = newVal;
    }

    do(b: BasicSoundBank) {
        b.defaultModulators = this.newVal;
        this.setDmods(this.newVal);
    }

    undo(b: BasicSoundBank) {
        b.defaultModulators = this.oldVal;
        this.setDmods(this.oldVal);
    }
}

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
        manager.modifyBank(
            new SetDefaultModulators(
                setDmods,
                [...mods],
                [...manager.bank.defaultModulators]
            )
        );
    };

    return (
        <div className={"default_modulators"}>
            <h2 className={"default_modulators_title"}>
                {t("bankInfo.defaultModulatorsFor")}{" "}
                <i>{manager.getBankName(t)}</i>:
            </h2>
            <ModulatorList
                clipboardManager={manager.clipboard}
                modulatorList={dmods}
                setModulatorList={setDefaultModulators}
            ></ModulatorList>
        </div>
    );
}
