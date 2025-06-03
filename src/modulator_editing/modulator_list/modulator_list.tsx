import { Modulator } from "spessasynth_core";
import { ModulatorView } from "../modulator/modulator.tsx";
import "./modulator_list.css";
import { useTranslation } from "react-i18next";
import { useState } from "react";

export function ModulatorList({
    modulatorList,
    setModulatorList
}: {
    modulatorList: Modulator[];
    setModulatorList: (l: Modulator[]) => void;
}) {
    const { t } = useTranslation();

    const newModulator = () => {
        const mod = new Modulator(0x0, 0x0, 48, 0, 0);
        const newList = [mod, ...modulatorList];
        setModulatorList(newList);
    };

    const [activeModPickerId, setActiveModPickerId] = useState<string | null>(
        null
    );

    return (
        <div className={"modulator_list"}>
            <div onClick={newModulator} className={"modulator_main"}>
                <h2 style={{ cursor: "pointer" }}>
                    {t("modulatorLocale.newModulator")}
                </h2>
            </div>
            {modulatorList.map((mod, i) => {
                const setMod = (m: Modulator) => {
                    const newList = [...modulatorList];
                    newList[i] = Modulator.copy(m);
                    setModulatorList(newList);
                };

                const deleteMod = () => {
                    const newList = modulatorList.filter((m) => m !== mod);
                    setModulatorList(newList);
                };

                return (
                    <ModulatorView
                        key={i}
                        modulatorNumber={i + 1}
                        modulator={mod}
                        setModulator={setMod}
                        deleteModulator={deleteMod}
                        setActiveModPickerId={setActiveModPickerId}
                        activeModPickerId={activeModPickerId}
                    ></ModulatorView>
                );
            })}
        </div>
    );
}
