import { GeneratorTypes, Modulator, ModulatorSource } from "spessasynth_core";
import type * as React from "react";
import {
    ModulatorCard,
    type ModulatorSourceSlot
} from "../modulator/modulator_card.tsx";
import "./modulator_list.css";
import { useTranslation } from "react-i18next";
import { Fragment, useRef, useState } from "react";
import { useClipboard } from "../../clipboard/clipboard_context.ts";
import toast from "react-hot-toast";
import { getObjectId, shareObjectId } from "../../utils/object_id.ts";
import type { ModulatorView as ModulatorData } from "../../core_backend/entity_views.ts";
import { getClickedSelection, selectBetween } from "./modulator_selection.ts";
import { MODULATOR_LIST_BUTTON_CLASS } from "./modulator_list_button.ts";
import { ModulatorListActions } from "./modulator_list_actions.tsx";
import { isSameModulator } from "../same_modulator.ts";
import { ModulatorNewButton } from "./modulator_new_button.tsx";
import { useBackHandler } from "../../hooks/use_back_handler.ts";
import { BACK_LEVELS } from "../../phone_shell/back_stack.ts";
import { useLayout } from "../../layout/layout_context.ts";
import { ModulatorSummary } from "../modulator/modulator_summary.tsx";
import { useIsEditorCovered } from "../../phone_shell/use_is_editor_covered.ts";
import {
    getShownModulators,
    mergeHiddenModulators
} from "../../core_backend/sfe_data.ts";

interface ModulatorListProps {
    modulatorList: readonly ModulatorData[];
    /**
     * The current modulators, read when an edit is applied. The list renders from the views.
     */
    getModulators: () => readonly Modulator[];
    /**
     * A change with a merge key joins the previous change of the same key in one undo step.
     */
    onModulatorListChange: (l: Modulator[], mergeKey?: string) => void;
    defaultModulators: readonly ModulatorData[];
    /**
     * SF2 mode hides the modulators with an SFE destination. They stay in the list the parent
     * gets, where they keep their places.
     */
    isSFE: boolean;
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
    modulatorList: allModulators,
    getModulators: getAllModulators,
    onModulatorListChange: onAllModulatorsChange,
    defaultModulators: allDefaultModulators,
    isSFE,
    extraActions,
    renderHeader
}: ModulatorListProps) {
    const { t } = useTranslation();
    // Everything below works on the shown modulators only
    const modulatorList = getShownModulators(allModulators, isSFE);
    const defaultModulators = getShownModulators(allDefaultModulators, isSFE);
    const getModulators = () => getShownModulators(getAllModulators(), isSFE);
    const onModulatorListChange = (list: Modulator[], mergeKey?: string) =>
        onAllModulatorsChange(
            isSFE ? list : mergeHiddenModulators(getAllModulators(), list),
            mergeKey
        );
    const { clipboard, contents } = useClipboard();
    const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(
        new Set()
    );
    const [anchorId, setAnchorId] = useState<number | null>(null);
    const layout = useLayout();
    // Phones show a summary per modulator, several may be open at once (spec 10)
    const [expandedIds, setExpandedIds] = useState<ReadonlySet<number>>(
        new Set()
    );
    const toggleExpanded = (id: number) =>
        setExpandedIds((previous) => {
            const next = new Set(previous);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
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
        // A new modulator starts open, it has nothing to summarize yet
        const id = getObjectId(mod);
        setExpandedIds((previous) => new Set(previous).add(id));
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
        change: (copy: Modulator) => void,
        mergeKey?: string
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
            current.map((m) => (m === original ? edited : m)),
            mergeKey
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
                selectionActions={
                    // Shift+click ranges and Ctrl+A have no touch stand-in, these are it
                    layout === "phone" ? (
                        <>
                            <button
                                type={"button"}
                                className={MODULATOR_LIST_BUTTON_CLASS}
                                aria-disabled={
                                    modulatorList.length === 0
                                        ? true
                                        : undefined
                                }
                                onClick={() =>
                                    setSelectedIds(
                                        new Set(modulatorList.map((m) => m.id))
                                    )
                                }
                            >
                                {t("phoneLocale.selection.all")}
                            </button>
                            <button
                                type={"button"}
                                className={MODULATOR_LIST_BUTTON_CLASS}
                                aria-disabled={
                                    selectedCount < 2 ? true : undefined
                                }
                                onClick={() => {
                                    if (selectedCount >= 2) {
                                        setSelectedIds(
                                            selectBetween(
                                                modulatorList.map((m) => m.id),
                                                selectedIds
                                            )
                                        );
                                    }
                                }}
                            >
                                {t("phoneLocale.selection.between")}
                            </button>
                        </>
                    ) : null
                }
            >
                {extraActions}
            </ModulatorListActions>
            <div className={"list_contents"}>
                {modulatorList.map((mod, i) => {
                    const { id } = mod;
                    const registerNumber = (
                        button: HTMLButtonElement | null
                    ) => {
                        if (button) {
                            numberButtons.current.set(id, button);
                        } else {
                            numberButtons.current.delete(id);
                        }
                    };
                    const card = (
                        <ModulatorCard
                            key={id}
                            ref={
                                layout === "phone" ? undefined : registerNumber
                            }
                            modulatorNumber={i + 1}
                            mod={mod}
                            onChange={(change, mergeKey) =>
                                replaceModulator(id, change, mergeKey)
                            }
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
                            isSFE={isSFE}
                            isOverridingDefault={defaultModulators.some((m) =>
                                isSameModulator(m, mod, false)
                            )}
                        />
                    );
                    if (layout !== "phone") {
                        return card;
                    }
                    const isExpanded = expandedIds.has(id);
                    return (
                        <Fragment key={id}>
                            <ModulatorSummary
                                ref={registerNumber}
                                mod={mod}
                                modulatorNumber={i + 1}
                                isSelected={selectedIds.has(id)}
                                isExpanded={isExpanded}
                                onToggleExpanded={() => toggleExpanded(id)}
                                onSelect={(e) => handleSelect(e, id)}
                            />
                            {isExpanded ? (
                                <div className={"modulator_summary_form"}>
                                    {card}
                                    <button
                                        type={"button"}
                                        className={
                                            "pretty_button modulator_summary_done"
                                        }
                                        onClick={() => toggleExpanded(id)}
                                    >
                                        {t("phoneLocale.modulators.done")}
                                    </button>
                                </div>
                            ) : null}
                        </Fragment>
                    );
                })}
            </div>
        </div>
    );
}
