import { type BasicInstrument, BasicPreset } from "spessasynth_core";
import type { MouseEvent, PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useClipboard } from "../clipboard/clipboard_context.ts";
import { DropdownHeader } from "./dropdown_header/dropdown_header.tsx";
import { PresetDisplay } from "./preset_display/preset_display.tsx";
import { getObjectId } from "../utils/object_id.ts";
import { VirtualItemList } from "./virtual_item_list.tsx";
import { useSelectionCommands } from "./use_selection_commands.ts";
import { useExpandedItems, useSectionOpen } from "./use_list_state.ts";
import {
    createInstrumentLinkActions,
    createPresetFromInstruments
} from "./link_actions.ts";

interface PresetListProps {
    presets: readonly BasicPreset[];
    view: BankEditView;
    selected: ReadonlySet<BasicPreset>;
    selectedInstruments: ReadonlySet<BasicInstrument>;
    onItemClick: (preset: BasicPreset, event: MouseEvent) => void;
    onItemContextMenu: (preset: BasicPreset, event: MouseEvent) => void;
    onItemPointerDown: (preset: BasicPreset, event: PointerEvent) => void;
}

export function PresetList({
    presets,
    view,
    selected,
    selectedInstruments,
    onItemClick,
    onItemContextMenu,
    onItemPointerDown
}: PresetListProps) {
    const { t } = useTranslation();
    const { session, apply } = useBankEditor();
    const { clipboard, contents } = useClipboard();
    const commands = useSelectionCommands();
    const [isOpen, setIsOpen] = useSectionOpen(
        view,
        view instanceof BasicPreset
    );
    const { isExpanded, toggle } = useExpandedItems();

    const canLink = selectedInstruments.size > 0;
    return (
        <>
            <DropdownHeader
                text={t("presetList.presets")}
                isOpen={isOpen}
                onToggle={() => setIsOpen(!isOpen)}
                onAdd={
                    canLink
                        ? () =>
                              apply([
                                  createPresetFromInstruments(
                                      session.document,
                                      selectedInstruments
                                  )
                              ])
                        : undefined
                }
                onCopy={
                    selected.size > 0
                        ? () => {
                              clipboard.copyPresets(selected, session);
                              toast.success(
                                  t("clipboardLocale.copiedPresets", {
                                      count: selected.size
                                  })
                              );
                          }
                        : undefined
                }
                onPaste={
                    contents.presets > 0 ? commands.pastePresets : undefined
                }
            />
            {isOpen ? (
                <VirtualItemList
                    items={presets}
                    focusedItem={view instanceof BasicPreset ? view : undefined}
                    renderItem={(preset) => {
                        const key = String(getObjectId(preset));
                        const instrumentKey = (instrumentId: number) =>
                            `${key}-${instrumentId}`;
                        return (
                            <PresetDisplay
                                preset={preset}
                                view={view}
                                isSelected={selected.has(preset)}
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
