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
    const [selectedMods, setSelectedMods] = useState<boolean[]>(
        Array(modulatorList.length).fill(false)
    );

    const newModulator = () => {
        const mod = new Modulator(0x0, 0x0, 48, 0, 0);
        const newList = [mod, ...modulatorList];
        setModulatorList(newList);
    };

    const deleteSelected = () => {
        const newList = modulatorList.filter((_m, i) => !selectedMods[i]);
        setModulatorList(newList);
        setSelectedMods(Array(newList.length).fill(false));
    };

    const [activeModPickerId, setActiveModPickerId] = useState<string | null>(
        null
    );

    return (
        <div className={"modulator_list"}>
            <div className={"action_buttons"}>
                <div
                    onClick={newModulator}
                    className={"modulator_main modulator_list_button"}
                >
                    <h2 style={{ cursor: "pointer" }}>
                        {t("modulatorLocale.actions.newModulator")}
                    </h2>
                </div>
                {selectedMods.some((s) => s) && (
                    <div
                        onClick={deleteSelected}
                        className={"modulator_main modulator_list_button"}
                    >
                        <h2 style={{ cursor: "pointer" }}>
                            {t("modulatorLocale.actions.deleteSelected")}
                        </h2>
                    </div>
                )}
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

                const setSelected = (s: boolean) => {
                    const newSelected = [...selectedMods];
                    newSelected[i] = s;
                    setSelectedMods(newSelected);
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
                        selected={selectedMods[i]}
                        setSelected={setSelected}
                    ></ModulatorView>
                );
            })}
        </div>
    );
}
