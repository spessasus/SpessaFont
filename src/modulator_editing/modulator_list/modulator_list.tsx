import { GeneratorTypes, Modulator, ModulatorSource } from "spessasynth_core";
import type * as React from "react";
import {
    ModulatorCard,
    type ModulatorSourceSlot
} from "../modulator/modulator_card.tsx";
import "./modulator_list.css";
import { useTranslation } from "react-i18next";
import { useRef, useState } from "react";
import { useClipboard } from "../../clipboard/clipboard_context.ts";
import toast from "react-hot-toast";
import { getObjectId, shareObjectId } from "../../utils/object_id.ts";
import type { ModulatorView as ModulatorData } from "../../core_backend/entity_views.ts";
import { getClickedSelection } from "./modulator_selection.ts";
import { ModulatorListActions } from "./modulator_list_actions.tsx";
import { isSameModulator } from "../same_modulator.ts";
import { ModulatorNewButton } from "./modulator_new_button.tsx";
import { useBackHandler } from "../../hooks/use_back_handler.ts";
import { BACK_LEVELS } from "../../phone_shell/back_stack.ts";
import { useIsEditorCovered } from "../../phone_shell/use_is_editor_covered.ts";

interface ModulatorListProps {
    modulatorList: readonly ModulatorData[];
    /**
     * The current modulators, read when an edit is applied. The list renders from the views.
     */
    getModulators: () => readonly Modulator[];
    onModulatorListChange: (l: Modulator[]) => void;
    defaultModulators: readonly ModulatorData[];
    /**
     * Extra buttons for the action bar, after the list's own.
     */
    extraActions?: React.ReactNode;
    /**
     * Phone only. A header at the top of the list that holds the New button, so the title is
     * laid out next to it and the action bar keeps the rest.
     */
    renderHeader?: (newButton: React.ReactNode) => React.ReactNode;
}

function isTyping(target: EventTarget) {
    return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
    );
}

/**
 * Selection and the open curve picker are kept by modulator id, and an edited modulator keeps
 * the id of the one it replaces, so both survive edits.
 * The list handles its own Delete, Ctrl+A, C, X and V for the selected modulators, so the
 * element list's shortcuts do not run while the focus is in it.
 */
export function ModulatorList({
    modulatorList,
    getModulators,
    onModulatorListChange,
    defaultModulators,
    extraActions,
    renderHeader
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
    // Focusable, so a click on the empty area of a card keeps the keys here
    const rootRef = useRef<HTMLDivElement>(null);
    const numberButtons = useRef(new Map<number, HTMLButtonElement>());

    const selectedCount = modulatorList.filter((m) =>
        selectedIds.has(m.id)
    ).length;
    const isEditorCovered = useIsEditorCovered();
    // On a phone, back ends the selection before it closes the modulator layer. While the
    // navigator covers the editor, back closes the navigator first, as the user cannot see
    // the selection it would end
    useBackHandler(
        selectedCount > 0 && !isEditorCovered,
        BACK_LEVELS.selection,
        () => {
            setSelectedIds(new Set());
            return true;
        }
    );

    /**
     * Moves the focus off the modulators about to be removed, to the next one that stays, or
     * the last one before them, or the list itself.
     */
    const focusAfterRemoval = (removedIds: ReadonlySet<number>) => {
        const ids = modulatorList.map((m) => m.id);
        const firstRemoved = ids.findIndex((id) => removedIds.has(id));
        const remaining = (from: readonly number[]) =>
            from.filter((id) => !removedIds.has(id));
        const nextId =
            remaining(ids.slice(firstRemoved)).at(0) ??
            remaining(ids.slice(0, firstRemoved)).at(-1);
        const button =
            nextId === undefined
                ? undefined
                : numberButtons.current.get(nextId);
        (button ?? rootRef.current)?.focus();
    };

    const addModulator = () => {
        const mod = new Modulator(
            new ModulatorSource(),
            new ModulatorSource(),
            GeneratorTypes.initialAttenuation,
            0,
            0
        );
        onModulatorListChange([mod, ...getModulators()]);
    };

    const deleteSelected = () => {
        focusAfterRemoval(selectedIds);
        onModulatorListChange(
            getModulators().filter((m) => !selectedIds.has(getObjectId(m)))
        );
        setSelectedIds(new Set());
    };

    const deleteOne = (id: number) => {
        focusAfterRemoval(new Set([id]));
        onModulatorListChange(
            getModulators().filter((m) => getObjectId(m) !== id)
        );
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
        onModulatorListChange([...pasted, ...getModulators()]);
        toast.success(
            t("clipboardLocale.pastedModulators", { count: pasted.length })
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        // Keys typed into the amount or a select belong to it
        if (isTyping(e.target)) {
            return;
        }
        const hasSelection = selectedCount > 0;
        if (e.key === "Delete") {
            // Marked as handled even without a selection, so the element list does not delete
            e.preventDefault();
            if (hasSelection && !e.repeat) {
                deleteSelected();
            }
            return;
        }
        // Cmd on macOS, and Caps Lock gives upper case letters
        if (!(e.ctrlKey || e.metaKey)) {
            return;
        }
        switch (e.key.toLowerCase()) {
            case "a": {
                e.preventDefault();
                setSelectedIds(new Set(modulatorList.map((m) => m.id)));
                break;
            }

            case "c": {
                e.preventDefault();
                if (hasSelection) {
                    copySelected();
                }
                break;
            }

            case "x": {
                e.preventDefault();
                if (hasSelection && !e.repeat) {
                    copySelected();
                    deleteSelected();
                }
                break;
            }

            case "v": {
                e.preventDefault();
                if (contents.modulators > 0 && !e.repeat) {
                    paste();
                }
                break;
            }

            case "d": {
                // Nothing to duplicate here, but the element list must not either
                e.preventDefault();
            }
        }
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
        // An edit that changes nothing (the same amount typed again) makes no undo step
        if (Modulator.isIdentical(original, edited, true)) {
            return;
        }
        shareObjectId(original, edited);
        onModulatorListChange(
            current.map((m) => (m === original ? edited : m))
        );
    };

    const newButton = <ModulatorNewButton onAdd={addModulator} />;

    return (
        <div
            className={"modulator_list"}
            ref={rootRef}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
        >
            {renderHeader?.(newButton)}
            <ModulatorListActions
                count={modulatorList.length}
                canPaste={contents.modulators > 0}
                hasSelection={selectedCount > 0}
                newButton={renderHeader ? null : newButton}
                onPaste={paste}
                onCopy={copySelected}
                onDelete={deleteSelected}
            >
                {extraActions}
            </ModulatorListActions>
            <div className={"list_contents"}>
                {modulatorList.map((mod, i) => {
                    const { id } = mod;
                    return (
                        <ModulatorCard
                            key={id}
                            ref={(button) => {
                                if (button) {
                                    numberButtons.current.set(id, button);
                                } else {
                                    numberButtons.current.delete(id);
                                }
                            }}
                            modulatorNumber={i + 1}
                            mod={mod}
                            onChange={(change) => replaceModulator(id, change)}
                            onDelete={() => deleteOne(id)}
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
                                isSameModulator(m, mod, false)
                            )}
                        />
                    );
                })}
            </div>
        </div>
    );
}
