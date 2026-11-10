import { BasicInstrument, type BasicSample } from "spessasynth_core";
import type { MouseEvent, PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import type { BankEditView, BankEntity } from "../core_backend/bank_view.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useClipboard } from "../clipboard/clipboard_context.ts";
import { DropdownHeader } from "./dropdown_header/dropdown_header.tsx";
import { InstrumentDisplay } from "./instrument_display/instrument_display.tsx";
import { getObjectId } from "../utils/object_id.ts";
import { type FocusRequest, VirtualItemList } from "./virtual_item_list.tsx";
import { useExpandedItems } from "./use_list_state.ts";
import { useSelectionCommands } from "./use_selection_commands.ts";
import {
    createInstrumentFromSamples,
    createSampleLinkActions
} from "./link_actions.ts";

interface InstrumentListProps {
    instruments: readonly BasicInstrument[];
    view: BankEditView;
    selected: ReadonlySet<BasicInstrument>;
    selectedSamples: ReadonlySet<BasicSample>;
    /**
     * The element the keyboard is on, kept in view.
     */
    cursor: BankEntity | undefined;
    focusRequest: FocusRequest | null;
    onItemClick: (instrument: BasicInstrument, event: MouseEvent) => void;
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
    onItemPointerDown: (
        instrument: BasicInstrument,
        event: PointerEvent
    ) => void;
}

export function InstrumentList({
    instruments,
    view,
    selected,
    selectedSamples,
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
}: InstrumentListProps) {
    const { t } = useTranslation();
    const { session, apply, applyCreate: create = apply } = useBankEditor();
    const { contents } = useClipboard();
    const commands = useSelectionCommands();
    const { isExpanded, toggle } = useExpandedItems();

    const canLink = selectedSamples.size > 0;
    return (
        <>
            <DropdownHeader
                text={t("presetList.instruments")}
                isOpen={isOpen}
                onToggle={() => onOpenChange(!isOpen)}
                addLabel={t("contextMenu.newInstrument")}
                addHint={t("presetList.newInstrumentHint")}
                onAdd={
                    canLink
                        ? () =>
                              create([
                                  createInstrumentFromSamples(
                                      session.document,
                                      selectedSamples
                                  )
                              ])
                        : undefined
                }
                onCopy={
                    selected.size > 0
                        ? () => commands.copy(selected)
                        : undefined
                }
                onPaste={contents.instruments > 0 ? commands.paste : undefined}
                onSelect={onStartSelection}
                count={instruments.length}
            />
            {isOpen ? (
                <VirtualItemList
                    items={instruments}
                    focusedItem={
                        cursor instanceof BasicInstrument ? cursor : undefined
                    }
                    focusRequest={focusRequest}
                    rowEstimate={rowEstimate}
                    renderItem={(instrument) => {
                        const key = String(getObjectId(instrument));
                        return (
                            <InstrumentDisplay
                                instrumentId={getObjectId(instrument)}
                                view={view}
                                isSelected={selected.has(instrument)}
                                isSelecting={isSelecting}
                                isShown={view === instrument}
                                isOpen={isExpanded(key)}
                                onToggle={() => toggle(key)}
                                onClick={(e) => onItemClick(instrument, e)}
                                onContextMenu={(e) =>
                                    onItemContextMenu(instrument, e)
                                }
                                onChildContextMenu={onItemContextMenu}
                                onPointerDown={(e) =>
                                    onItemPointerDown(instrument, e)
                                }
                                onLink={
                                    canLink
                                        ? () =>
                                              apply(
                                                  createSampleLinkActions(
                                                      instrument,
                                                      selectedSamples
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
