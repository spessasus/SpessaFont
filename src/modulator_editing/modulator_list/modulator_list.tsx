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
import type { ModulatorView as ModulatorData } from "../../core_backend/entity_views.ts";
import { getClickedSelection } from "./modulator_selection.ts";
import { ModulatorListActions } from "./modulator_list_actions.tsx";

interface ModulatorListProps {
    modulatorList: readonly ModulatorData[];
    /**
     * The current modulators, read when an edit is applied. The list renders from the views.
     */
    getModulators: () => readonly Modulator[];
    setModulatorList: (l: Modulator[]) => void;
    defaultModulators: readonly ModulatorData[];
}

function isSameSource(
    a: ModulatorData["primarySource"],
    b: ModulatorData["primarySource"]
) {
    return (
        a.index === b.index &&
        a.isCC === b.isCC &&
        a.isBipolar === b.isBipolar &&
        a.isNegative === b.isNegative &&
        a.curveType === b.curveType
    );
}

/**
 * Core's `Modulator.isIdentical` on views: the same sources, destination and transform, which
 * is what makes a zone modulator override a default one.
 */
function isSameModulator(a: ModulatorData, b: ModulatorData) {
    return (
        isSameSource(a.primarySource, b.primarySource) &&
        isSameSource(a.secondarySource, b.secondarySource) &&
        a.destination === b.destination &&
        a.transformType === b.transformType
    );
}

/**
 * Selection and the open curve picker are kept by modulator id, and an edited modulator keeps
 * the id of the one it replaces, so both survive edits.
 */
export function ModulatorList({
    modulatorList,
    getModulators,
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

    const selectedCount = modulatorList.filter((m) =>
        selectedIds.has(m.id)
    ).length;

    const addModulator = () => {
        const mod = new Modulator(
            new ModulatorSource(),
            new ModulatorSource(),
            GeneratorTypes.initialAttenuation,
            0,
            0
        );
        setModulatorList([mod, ...getModulators()]);
    };

    const deleteSelected = () => {
        setModulatorList(
            getModulators().filter((m) => !selectedIds.has(getObjectId(m)))
        );
        setSelectedIds(new Set());
    };

    const copySelected = () => {
        const selectedMods = getModulators().filter((m) =>
            selectedIds.has(getObjectId(m))
        );
        clipboard.copyModulators(selectedMods);
        toast.success(
            t("clipboardLocale.copiedModulators", {
                count: selectedMods.length
            })
        );
    };

    const paste = () => {
        const pasted = clipboard.getModulators();
        setModulatorList([...pasted, ...getModulators()]);
        toast.success(
            t("clipboardLocale.pastedModulators", { count: pasted.length })
        );
    };

    const handleSelect = (e: React.MouseEvent, id: number) => {
        setSelectedIds(
            getClickedSelection(
                modulatorList.map((m) => m.id),
                selectedIds,
                anchorId,
                id,
                e.shiftKey
            )
        );
        setAnchorId(id);
    };

    const replaceModulator = (
        id: number,
        change: (copy: Modulator) => void
    ) => {
        const current = getModulators();
        const original = current.find((m) => getObjectId(m) === id);
        if (!original) {
            return;
        }
        const edited = Modulator.copyFrom(original);
        change(edited);
        shareObjectId(original, edited);
        setModulatorList(current.map((m) => (m === original ? edited : m)));
    };

    return (
        <div className={"modulator_list"}>
            <ModulatorListActions
                count={modulatorList.length}
                canPaste={contents.modulators > 0}
                hasSelection={selectedCount > 0}
                onAdd={addModulator}
                onPaste={paste}
                onCopy={copySelected}
                onDelete={deleteSelected}
            />
            <div className={"list_contents"}>
                {modulatorList.map((mod, i) => {
                    const { id } = mod;
                    return (
                        <ModulatorView
                            key={id}
                            modulatorNumber={i + 1}
                            mod={mod}
                            onChange={(change) => replaceModulator(id, change)}
                            onDelete={() =>
                                setModulatorList(
                                    getModulators().filter(
                                        (m) => getObjectId(m) !== id
                                    )
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
                            onSelect={(e) => handleSelect(e, id)}
                            isOverridingDefault={defaultModulators.some((m) =>
                                isSameModulator(m, mod)
                            )}
                        />
                    );
                })}
            </div>
        </div>
    );
}
