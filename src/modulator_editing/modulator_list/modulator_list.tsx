import {
    generatorTypes,
    Modulator,
    modulatorCurveTypes,
    modulatorSources
} from "spessasynth_core";
import { ModulatorView } from "../modulator/modulator.tsx";
import "./modulator_list.css";
import { useTranslation } from "react-i18next";
import { type JSX, useState } from "react";
import type { ClipboardManager } from "../../core_backend/clipboard_manager.ts";

export type ModulatorListGlobals = {
    clipboardManager: ClipboardManager;
    ccOptions: JSX.Element;
    destinationOptions: JSX.Element;
};

type ModulatorListProps = ModulatorListGlobals & {
    modulatorList: Modulator[];
    setModulatorList: (l: Modulator[]) => void;
};

export function ModulatorList({
    modulatorList,
    setModulatorList,
    clipboardManager,
    ccOptions,
    destinationOptions
}: ModulatorListProps) {
    const { t } = useTranslation();
    const [selectedMods, setSelectedMods] = useState(new Set<Modulator>());
    const [clipboard, setClipboard] = useState(
        clipboardManager.getModulators()
    );

    const newModulator = () => {
        const mod = new Modulator(
            modulatorSources.noController,
            modulatorCurveTypes.linear,
            0,
            0,
            0,
            modulatorSources.noController,
            modulatorCurveTypes.linear,
            0,
            0,
            0,
            generatorTypes.initialAttenuation,
            0,
            0
        );
        const newList = [mod, ...modulatorList];
        setModulatorList(newList);
    };

    const deleteSelected = () => {
        const newList = modulatorList.filter((m) => !selectedMods.has(m));
        setModulatorList(newList);
        setSelectedMods(new Set<Modulator>());
    };

    const copyToClipboard = () => {
        const toCopy = Array.from(selectedMods);
        clipboardManager.copyModulators(toCopy);
        setClipboard(toCopy);
    };

    const pasteFromClipboard = () => {
        const newList = [...clipboard, ...modulatorList];
        setModulatorList(newList);
    };

    const [activeModPickerId, setActiveModPickerId] = useState<string | null>(
        null
    );

    const hasSelectedMods = selectedMods.size > 0;

    return (
        <div className={"modulator_list"}>
            <div className={"action_buttons"}>
                <div
                    style={{ cursor: "default" }}
                    className={"modulator_main modulator_list_button"}
                >
                    {t("modulatorLocale.modulators")}: {modulatorList.length}
                </div>
                <div
                    onClick={newModulator}
                    className={
                        "modulator_main modulator_list_button hover_brightness"
                    }
                >
                    {t("menuBarLocale.file.new")}
                </div>
                {clipboard.length > 0 && (
                    <div
                        className={
                            "modulator_main modulator_list_button hover_brightness"
                        }
                        onClick={pasteFromClipboard}
                    >
                        {t("paste")}
                    </div>
                )}
                {hasSelectedMods && (
                    <div
                        onClick={copyToClipboard}
                        className={
                            "modulator_main modulator_list_button hover_brightness"
                        }
                    >
                        {t("copy")}
                    </div>
                )}
                {hasSelectedMods && (
                    <div
                        onClick={deleteSelected}
                        className={
                            "modulator_main modulator_list_button hover_brightness"
                        }
                    >
                        {t("delete")}
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
                        if (s) {
                            selectedMods.add(mod);
                        } else {
                            selectedMods.delete(mod);
                        }
                        setSelectedMods(new Set<Modulator>(selectedMods));
                    };

                    return (
                        <ModulatorView
                            destinationList={destinationOptions}
                            ccList={ccOptions}
                            key={i}
                            modulatorNumber={i + 1}
                            mod={Modulator.copy(mod)}
                            setModulator={setMod}
                            deleteModulator={deleteMod}
                            setActiveModPickerId={setActiveModPickerId}
                            activeModPickerId={activeModPickerId}
                            selected={selectedMods.has(mod)}
                            setSelected={setSelected}
                        ></ModulatorView>
                    );
                })}
            </div>
        </div>
    );
}
