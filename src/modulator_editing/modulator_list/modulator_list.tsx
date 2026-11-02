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
import { getClickedSelection } from "./modulator_selection.ts";
import { ModulatorListActions } from "./modulator_list_actions.tsx";

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
        setSelectedIds(
            getClickedSelection(
                modulatorList.map((m) => getObjectId(m)),
                selectedIds,
                anchorId,
                id,
                e.shiftKey
            )
        );
        setAnchorId(id);
    };

    const replaceModulator = (original: Modulator, edited: Modulator) => {
        shareObjectId(original, edited);
        setModulatorList(
            modulatorList.map((m) => (m === original ? edited : m))
        );
    };

    return (
        <div className={"modulator_list"}>
            <ModulatorListActions
                count={modulatorList.length}
                canPaste={contents.modulators > 0}
                hasSelection={selectedMods.length > 0}
                onAdd={addModulator}
                onPaste={paste}
                onCopy={copySelected}
                onDelete={deleteSelected}
            />
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
