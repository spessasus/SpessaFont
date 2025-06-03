import { Modulator } from "spessasynth_core";
import { ModulatorView } from "../modulator/modulator.tsx";
import "./modulator_list.css";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import type { ClipBoardManager } from "../../clipboard_manager.ts";

type ModulatorListProps = {
    modulatorList: Modulator[];
    setModulatorList: (l: Modulator[]) => void;
    clipboardManager: ClipBoardManager;
};

export function ModulatorList({
    modulatorList,
    setModulatorList,
    clipboardManager
}: ModulatorListProps) {
    const { t } = useTranslation();
    const [selectedMods, setSelectedMods] = useState<boolean[]>(
        Array(modulatorList.length).fill(false)
    );
    const [clipboard, setClipboard] = useState(
        clipboardManager.getModulators()
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

    const copyToCliboard = () => {
        const toCopy = modulatorList.filter((_m, i) => selectedMods[i]);
        clipboardManager.setModulators(toCopy);
        setClipboard(toCopy);
    };

    const pasteFromClipboard = () => {
        const newList = [...clipboard, ...modulatorList];
        setModulatorList(newList);
    };

    const [activeModPickerId, setActiveModPickerId] = useState<string | null>(
        null
    );

    const hasSelectedMods = selectedMods.some((s) => s);

    return (
        <div className={"modulator_list"}>
            <div className={"action_buttons"}>
                <div
                    style={{ cursor: "default" }}
                    className={"modulator_main modulator_list_button"}
                >
                    {t("modulatorLocale.actions.modulators")}:{" "}
                    {modulatorList.length}
                </div>
                <div
                    onClick={newModulator}
                    className={"modulator_main modulator_list_button"}
                >
                    {t("menuBarLocale.file.new")}
                </div>
                {clipboard.length > 0 && (
                    <div
                        className={"modulator_main modulator_list_button"}
                        onClick={pasteFromClipboard}
                    >
                        {t("menuBarLocale.edit.paste")}
                    </div>
                )}
                {hasSelectedMods && (
                    <div
                        onClick={copyToCliboard}
                        className={"modulator_main modulator_list_button"}
                    >
                        <h3>{t("menuBarLocale.edit.copy")}</h3>
                    </div>
                )}
                {hasSelectedMods && (
                    <div
                        onClick={deleteSelected}
                        className={"modulator_main modulator_list_button"}
                    >
                        <h3>{t("menuBarLocale.edit.delete")}</h3>
                    </div>
                )}
            </div>
            <div className={"list_contents"}>
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
        </div>
    );
}
