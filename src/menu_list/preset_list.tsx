import { type BasicInstrument, BasicPreset } from "spessasynth_core";
import type { MouseEvent, PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import type { BankEditView, BankEntity } from "../core_backend/bank_view.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useClipboard } from "../clipboard/clipboard_context.ts";
import { DropdownHeader } from "./dropdown_header/dropdown_header.tsx";
import { PresetDisplay } from "./preset_display/preset_display.tsx";
import { getObjectId } from "../utils/object_id.ts";
import { type FocusRequest, VirtualItemList } from "./virtual_item_list.tsx";
import { useSelectionCommands } from "./use_selection_commands.ts";
import { useExpandedItems } from "./use_list_state.ts";
import {
    createInstrumentLinkActions,
    createPresetFromInstruments
} from "./link_actions.ts";

interface PresetListProps {
    presets: readonly BasicPreset[];
    view: BankEditView;
    selected: ReadonlySet<BasicPreset>;
    selectedInstruments: ReadonlySet<BasicInstrument>;
    /**
     * The element the keyboard is on, kept in view.
     */
    cursor: BankEntity | undefined;
    focusRequest: FocusRequest | null;
    onItemClick: (preset: BasicPreset, event: MouseEvent) => void;
    onItemContextMenu: (entity: BankEntity, event: MouseEvent) => void;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    /**
     * Enters selection mode from the section menu's Select….
     */
    onStartSelection: () => void;
    /**
     * Whether the phone's selection mode is on, which shows a checkbox on each row.
     */
    isSelecting: boolean;
    /**
     * The estimated row height in pixels, for the virtual list.
     */
    rowEstimate?: number;
    onItemPointerDown: (preset: BasicPreset, event: PointerEvent) => void;
}

export function PresetList({
    presets,
    view,
    selected,
    selectedInstruments,
    cursor,
    focusRequest,
    onItemClick,
    onItemContextMenu,
    onItemPointerDown,
    isOpen,
    onOpenChange,
    onStartSelection,
    isSelecting,
    rowEstimate
}: PresetListProps) {
    const { t } = useTranslation();
    const { session, apply, applyCreate: create = apply } = useBankEditor();
    const { contents } = useClipboard();
    const commands = useSelectionCommands();
    const { isExpanded, toggle } = useExpandedItems();

    const canLink = selectedInstruments.size > 0;
    return (
        <>
            <DropdownHeader
                text={t("presetList.presets")}
                isOpen={isOpen}
                onToggle={() => onOpenChange(!isOpen)}
                addLabel={t("contextMenu.newPreset")}
                addHint={t("presetList.newPresetHint")}
                onAdd={
                    canLink
                        ? () =>
                              create([
                                  createPresetFromInstruments(
                                      session.document,
                                      selectedInstruments
                                  )
                              ])
                        : undefined
                }
                onCopy={
                    selected.size > 0
                        ? () => commands.copy(selected)
                        : undefined
                }
                onPaste={contents.presets > 0 ? commands.paste : undefined}
                onSelect={onStartSelection}
                count={presets.length}
            />
            {isOpen ? (
                <VirtualItemList
                    items={presets}
                    focusedItem={
                        cursor instanceof BasicPreset ? cursor : undefined
                    }
                    focusRequest={focusRequest}
                    rowEstimate={rowEstimate}
                    renderItem={(preset) => {
                        const key = String(getObjectId(preset));
                        const instrumentKey = (instrumentId: number) =>
                            `${key}-${instrumentId}`;
                        return (
                            <PresetDisplay
                                preset={preset}
                                view={view}
                                isSelected={selected.has(preset)}
                                isSelecting={isSelecting}
                                isShown={view === preset}
                                isOpen={isExpanded(key)}
                                onToggle={() => toggle(key)}
                                isInstrumentOpen={(id) =>
                                    isExpanded(instrumentKey(id))
                                }
                                onToggleInstrument={(id) =>
                                    toggle(instrumentKey(id))
                                }
                                onClick={(e) => onItemClick(preset, e)}
                                onContextMenu={(e) =>
                                    onItemContextMenu(preset, e)
                                }
                                onChildContextMenu={onItemContextMenu}
                                onPointerDown={(e) =>
                                    onItemPointerDown(preset, e)
                                }
                                onLink={
                                    canLink
                                        ? () =>
                                              apply(
                                                  createInstrumentLinkActions(
                                                      preset,
                                                      selectedInstruments
                                                  )
                                              )
                                        : undefined
                                }
                            />
                        );
                    }}
                />
            ) : null}
        </>
    );
}
