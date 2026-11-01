import { type BasicInstrument, BasicPreset, BasicZone } from "spessasynth_core";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useClipboard } from "../clipboard/clipboard_context.ts";
import { DropdownHeader } from "./dropdown_header/dropdown_header.tsx";
import { PresetDisplay } from "./preset_display/preset_display.tsx";
import { CreatePresetAction } from "./create_actions/create_preset_action.ts";
import { CreateZoneAction } from "../generator_table/create_zone_action.ts";
import { getObjectId } from "../utils/object_id.ts";
import { VirtualItemList } from "./virtual_item_list.tsx";
import { useExpandedItems, useSectionOpen } from "./use_list_state.ts";

interface PresetListProps {
    presets: readonly BasicPreset[];
    view: BankEditView;
    selected: ReadonlySet<BasicPreset>;
    selectedInstruments: ReadonlySet<BasicInstrument>;
    onItemClick: (preset: BasicPreset, event: MouseEvent) => void;
}

export function PresetList({
    presets,
    view,
    selected,
    selectedInstruments,
    onItemClick
}: PresetListProps) {
    const { t } = useTranslation();
    const { session, apply } = useBankEditor();
    const { clipboard, contents } = useClipboard();
    const [isOpen, setIsOpen] = useSectionOpen(
        view,
        view instanceof BasicPreset
    );
    const { isExpanded, toggle } = useExpandedItems();

    const createPreset = () => {
        const preset = new BasicPreset(session.document.bank);
        preset.name = [...selectedInstruments][0].name;
        for (const instrument of selectedInstruments) {
            preset.createZone(instrument);
        }
        // Move to the first free bank number
        const allPresets = session.document.presets;
        for (let i = 1; allPresets.some((p) => p.matches(preset)); i++) {
            preset.bankMSB = i & 0x7f;
            preset.bankLSB = Math.max(i >> 7, 0);
        }
        apply([new CreatePresetAction(preset)]);
    };

    const linkInstruments = (preset: BasicPreset) => {
        apply(
            Array.from(
                selectedInstruments,
                (instrument) =>
                    new CreateZoneAction(preset, new BasicZone(), instrument)
            )
        );
    };

    const canLink = selectedInstruments.size > 0;
    return (
        <>
            <DropdownHeader
                text={t("presetList.presets")}
                isOpen={isOpen}
                onToggle={() => setIsOpen(!isOpen)}
                onAdd={canLink ? createPreset : undefined}
                onCopy={
                    selected.size > 0
                        ? () => {
                              clipboard.copyPresets(selected);
                              toast.success(
                                  t("clipboardLocale.copiedPresets", {
                                      count: selected.size
                                  })
                              );
                          }
                        : undefined
                }
                onPaste={
                    contents.presets > 0
                        ? () => {
                              apply(clipboard.pastePresets(session.document));
                              toast.success(
                                  t("clipboardLocale.pastedPresets", {
                                      count: clipboard.presetCount
                                  })
                              );
                          }
                        : undefined
                }
            />
            {isOpen ? (
                <VirtualItemList
                    items={presets}
                    focusedItem={view instanceof BasicPreset ? view : undefined}
                    renderItem={(preset) => {
                        const key = String(getObjectId(preset));
                        const instrumentKey = (instrument: BasicInstrument) =>
                            `${key}-${getObjectId(instrument)}`;
                        return (
                            <PresetDisplay
                                preset={preset}
                                view={view}
                                isSelected={selected.has(preset)}
                                isOpen={isExpanded(key)}
                                onToggle={() => toggle(key)}
                                isInstrumentOpen={(instrument) =>
                                    isExpanded(instrumentKey(instrument))
                                }
                                onToggleInstrument={(instrument) =>
                                    toggle(instrumentKey(instrument))
                                }
                                onClick={(e) => onItemClick(preset, e)}
                                onLink={
                                    canLink
                                        ? () => linkInstruments(preset)
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
