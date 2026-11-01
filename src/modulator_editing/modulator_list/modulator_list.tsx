import { GeneratorTypes, Modulator, ModulatorSource } from "spessasynth_core";
import type * as React from "react";
import {
    ModulatorView,
    type ModulatorSourceSlot
} from "../modulator/modulator.tsx";
import "./modulator_list.css";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useClipboard } from "../../clipboard/clipboard_context.ts";
import toast from "react-hot-toast";
import { getObjectId, shareObjectId } from "../../utils/object_id.ts";

interface ModulatorListProps {
    modulatorList: readonly Modulator[];
    setModulatorList: (l: Modulator[]) => void;
    defaultModulators: readonly Modulator[];
}

/**
 * Selection and the open curve picker are kept by modulator id, and an edited modulator keeps
 * the id of the one it replaces, so both survive edits.
 */
export function ModulatorList({
    modulatorList,
    setModulatorList,
    defaultModulators
}: ModulatorListProps) {
    const { t } = useTranslation();
    const { clipboard, contents } = useClipboard();
    const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(
        new Set()
    );
    const [anchorId, setAnchorId] = useState<number | null>(null);
    const [openCurvePicker, setOpenCurvePicker] = useState<{
        id: number;
        slot: ModulatorSourceSlot;
    } | null>(null);

    const selectedMods = modulatorList.filter((m) =>
        selectedIds.has(getObjectId(m))
    );

    const addModulator = () => {
        const mod = new Modulator(
            new ModulatorSource(),
            new ModulatorSource(),
            GeneratorTypes.initialAttenuation,
            0,
            0
        );
        setModulatorList([mod, ...modulatorList]);
    };

    const deleteSelected = () => {
        setModulatorList(
            modulatorList.filter((m) => !selectedIds.has(getObjectId(m)))
        );
        setSelectedIds(new Set());
    };

    const copySelected = () => {
        clipboard.copyModulators(selectedMods);
        toast.success(
            t("clipboardLocale.copiedModulators", {
                count: selectedMods.length
            })
        );
    };

    const paste = () => {
        const pasted = clipboard.getModulators();
        setModulatorList([...pasted, ...modulatorList]);
        toast.success(
            t("clipboardLocale.pastedModulators", { count: pasted.length })
        );
    };

    const handleSelect = (e: React.MouseEvent, mod: Modulator) => {
        const id = getObjectId(mod);
        const anchorIndex = modulatorList.findIndex(
            (m) => getObjectId(m) === anchorId
        );
        setAnchorId(id);
        const next = new Set(selectedIds);
        const shouldDeselect = selectedIds.has(id);
        if (anchorIndex === -1 || !e.shiftKey) {
            if (shouldDeselect) {
                next.delete(id);
            } else {
                next.add(id);
            }
            setSelectedIds(next);
            return;
        }
        // Shift-click selects (or deselects) everything between the last click and this one
        const index = modulatorList.indexOf(mod);
        const range = modulatorList.slice(
            Math.min(index, anchorIndex),
            Math.max(index, anchorIndex) + 1
        );
        for (const m of range) {
            if (shouldDeselect) {
                next.delete(getObjectId(m));
            } else {
                next.add(getObjectId(m));
            }
        }
        setSelectedIds(next);
    };

    const replaceModulator = (original: Modulator, edited: Modulator) => {
        shareObjectId(original, edited);
        setModulatorList(
            modulatorList.map((m) => (m === original ? edited : m))
        );
    };

    return (
        <div className={"modulator_list"}>
            <div className={"action_buttons"}>
                <span className={"modulator_main modulator_list_button"}>
                    {t("modulatorLocale.modulators")}: {modulatorList.length}
                </span>
                <button
                    type={"button"}
                    onClick={addModulator}
                    className={
                        "modulator_main modulator_list_button hover_brightness"
                    }
                >
                    {t("menuBarLocale.file.new")}
                </button>
                {contents.modulators > 0 && (
                    <button
                        type={"button"}
                        className={
                            "modulator_main modulator_list_button hover_brightness"
                        }
                        onClick={paste}
                    >
                        {t("paste")}
                    </button>
                )}
                {selectedMods.length > 0 && (
                    <>
                        <button
                            type={"button"}
                            onClick={copySelected}
                            className={
                                "modulator_main modulator_list_button hover_brightness"
                            }
                        >
                            {t("copy")}
                        </button>
                        <button
                            type={"button"}
                            onClick={deleteSelected}
                            className={
                                "modulator_main modulator_list_button hover_brightness"
                            }
                        >
                            {t("delete")}
                        </button>
                    </>
                )}
            </div>
            <div className={"list_contents"}>
                {modulatorList.map((mod, i) => {
                    const id = getObjectId(mod);
                    return (
                        <ModulatorView
                            key={id}
                            modulatorNumber={i + 1}
                            mod={mod}
                            onChange={(edited) => replaceModulator(mod, edited)}
                            onDelete={() =>
                                setModulatorList(
                                    modulatorList.filter((m) => m !== mod)
                                )
                            }
                            openCurvePicker={
                                openCurvePicker?.id === id
                                    ? openCurvePicker.slot
                                    : null
                            }
                            onOpenCurvePickerChange={(slot) =>
                                setOpenCurvePicker(slot ? { id, slot } : null)
                            }
                            isSelected={selectedIds.has(id)}
                            onSelect={(e) => handleSelect(e, mod)}
                            isOverridingDefault={defaultModulators.some((m) =>
                                Modulator.isIdentical(m, mod)
                            )}
                        />
                    );
                })}
            </div>
        </div>
    );
}
