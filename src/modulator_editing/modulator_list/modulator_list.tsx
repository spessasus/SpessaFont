import {
    generatorTypes,
    Modulator,
    modulatorCurveTypes,
    modulatorSources
} from "spessasynth_core";
import { ModulatorView } from "../modulator/modulator.tsx";
import "./modulator_list.css";
import { useTranslation } from "react-i18next";
import * as React from "react";
import { type JSX, useCallback, useState } from "react";
import type { ClipboardManager } from "../../core_backend/clipboard_manager.ts";
import toast from "react-hot-toast";

export type ModulatorListGlobals = {
    clipboardManager: ClipboardManager;
    ccOptions: JSX.Element;
    destinationOptions: JSX.Element;
};

type ModulatorListProps = ModulatorListGlobals & {
    modulatorList: Modulator[];
    setModulatorList: (l: Modulator[]) => void;
    defaultModulators: Modulator[];
};

export function ModulatorList({
    modulatorList,
    setModulatorList,
    clipboardManager,
    ccOptions,
    destinationOptions,
    defaultModulators
}: ModulatorListProps) {
    const { t } = useTranslation();
    const [selectedMods, setSelectedMods] = useState(new Set<Modulator>());
    const [clipboard, setClipboard] = useState(
        clipboardManager.getModulators()
    );
    const [lastSelectedMod, setLastSelectedMod] = useState<Modulator | null>(
        null
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
        toast.success(
            t("clipboardLocale.copiedModulators", { count: toCopy.length })
        );
    };

    const pasteFromClipboard = () => {
        const newList = [
            ...clipboard.map((m) => Modulator.copy(m)),
            ...modulatorList
        ];
        toast.success(
            t("clipboardLocale.pastedModulators", { count: clipboard.length })
        );
        setModulatorList(newList);
    };

    const [activeModPickerId, setActiveModPickerId] = useState<string | null>(
        null
    );

    const handleClick = useCallback(
        (e: React.MouseEvent, clickedMod: Modulator) => {
            if (!e.shiftKey || lastSelectedMod === null) {
                setLastSelectedMod(clickedMod);
                if (selectedMods.has(clickedMod)) {
                    selectedMods.delete(clickedMod);
                } else {
                    selectedMods.add(clickedMod);
                }
                setSelectedMods(new Set([...selectedMods]));
                return;
            }
            const index = modulatorList.indexOf(lastSelectedMod);
            const selIndex = modulatorList.indexOf(clickedMod);
            const start = Math.min(index, selIndex);
            const end = Math.max(index, selIndex) + 1;
            if (selectedMods.has(clickedMod)) {
                for (let i = start; i < end; i++) {
                    const m = modulatorList[i];
                    selectedMods.delete(m);
                }
            } else {
                for (let i = start; i < end; i++) {
                    const m = modulatorList[i];
                    selectedMods.add(m);
                }
            }
            setLastSelectedMod(clickedMod);
            setSelectedMods(new Set([...selectedMods]));
        },
        [lastSelectedMod, modulatorList, selectedMods]
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
                            onClick={(e) => handleClick(e, mod)}
                            overridingDefaultModulator={defaultModulators.some(
                                (m) => Modulator.isIdentical(m, mod)
                            )}
                        ></ModulatorView>
                    );
                })}
            </div>
        </div>
    );
}
