import { BasicInstrument, type BasicSample } from "spessasynth_core";
import type { MouseEvent, PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useClipboard } from "../clipboard/clipboard_context.ts";
import { DropdownHeader } from "./dropdown_header/dropdown_header.tsx";
import { InstrumentDisplay } from "./instrument_display/instrument_display.tsx";
import { getObjectId } from "../utils/object_id.ts";
import { VirtualItemList } from "./virtual_item_list.tsx";
import { useExpandedItems, useSectionOpen } from "./use_list_state.ts";
import {
    createInstrumentFromSamples,
    createSampleLinkActions
} from "./link_actions.ts";

interface InstrumentListProps {
    instruments: readonly BasicInstrument[];
    view: BankEditView;
    selected: ReadonlySet<BasicInstrument>;
    selectedSamples: ReadonlySet<BasicSample>;
    onItemClick: (instrument: BasicInstrument, event: MouseEvent) => void;
    onItemContextMenu: (instrument: BasicInstrument, event: MouseEvent) => void;
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
    onItemClick,
    onItemContextMenu,
    onItemPointerDown
}: InstrumentListProps) {
    const { t } = useTranslation();
    const { session, apply } = useBankEditor();
    const { clipboard, contents } = useClipboard();
    const [isOpen, setIsOpen] = useSectionOpen(
        view,
        view instanceof BasicInstrument
    );
    const { isExpanded, toggle } = useExpandedItems();

    const canLink = selectedSamples.size > 0;
    return (
        <>
            <DropdownHeader
                text={t("presetList.instruments")}
                isOpen={isOpen}
                onToggle={() => setIsOpen(!isOpen)}
                onAdd={
                    canLink
                        ? () =>
                              apply([
                                  createInstrumentFromSamples(selectedSamples)
                              ])
                        : undefined
                }
                onCopy={
                    selected.size > 0
                        ? () => {
                              clipboard.copyInstruments(selected, session);
                              toast.success(
                                  t("clipboardLocale.copiedInstruments", {
                                      count: selected.size
                                  })
                              );
                          }
                        : undefined
                }
                onPaste={
                    contents.instruments > 0
                        ? () => {
                              apply(clipboard.pasteInstruments(session));
                              toast.success(
                                  t("clipboardLocale.pastedInstruments", {
                                      count: clipboard.instrumentCount
                                  })
                              );
                          }
                        : undefined
                }
            />
            {isOpen ? (
                <VirtualItemList
                    items={instruments}
                    focusedItem={
                        view instanceof BasicInstrument ? view : undefined
                    }
                    renderItem={(instrument) => {
                        const key = String(getObjectId(instrument));
                        return (
                            <InstrumentDisplay
                                instrumentId={getObjectId(instrument)}
                                view={view}
                                isSelected={selected.has(instrument)}
                                isOpen={isExpanded(key)}
                                onToggle={() => toggle(key)}
                                onClick={(e) => onItemClick(instrument, e)}
                                onContextMenu={(e) =>
                                    onItemContextMenu(instrument, e)
                                }
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
