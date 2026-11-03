import { BasicSample } from "spessasynth_core";
import type { MouseEvent, PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { DropdownHeader } from "./dropdown_header/dropdown_header.tsx";
import { createSampleImportActions } from "./import_sample.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useClipboard } from "../clipboard/clipboard_context.ts";
import { SampleDisplay } from "./sample_display/sample_display.tsx";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import { logError } from "../utils/core_utils.ts";
import { pickFile } from "../utils/pick_file.ts";
import { VirtualItemList } from "./virtual_item_list.tsx";
import { useSectionOpen } from "./use_list_state.ts";

interface SampleListProps {
    samples: readonly BasicSample[];
    view: BankEditView;
    selected: ReadonlySet<BasicSample>;
    onItemClick: (sample: BasicSample, event: MouseEvent) => void;
    onItemContextMenu: (sample: BasicSample, event: MouseEvent) => void;
    onItemPointerDown: (sample: BasicSample, event: PointerEvent) => void;
}

export function SampleList({
    samples,
    view,
    selected,
    onItemClick,
    onItemContextMenu,
    onItemPointerDown
}: SampleListProps) {
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();
    const { session, apply, playSample } = useBankEditor();
    const { clipboard, contents } = useClipboard();
    const [isOpen, setIsOpen] = useSectionOpen(
        view,
        view instanceof BasicSample
    );

    const addSample = async () => {
        const file = await pickFile("audio/*");
        if (!file) {
            return;
        }
        let actions;
        try {
            actions = await createSampleImportActions(
                audioEngine.context,
                file
            );
        } catch (error) {
            logError("Failed to decode the audio file.", error);
            toast.error(t("sampleLocale.tools.invalidAudioFile"));
            return;
        }
        apply(actions);
        setIsOpen(true);
    };

    return (
        <>
            <DropdownHeader
                text={t("presetList.samples")}
                isOpen={isOpen}
                onToggle={() => setIsOpen(!isOpen)}
                onAdd={() => void addSample()}
                onCopy={
                    selected.size > 0
                        ? () => {
                              clipboard.copySamples(selected);
                              toast.success(
                                  t("clipboardLocale.copiedSamples", {
                                      count: selected.size
                                  })
                              );
                          }
                        : undefined
                }
                onPaste={
                    contents.samples > 0
                        ? () => {
                              apply(clipboard.pasteSamples(session.document));
                              toast.success(
                                  t("clipboardLocale.pastedSamples", {
                                      count: clipboard.sampleCount
                                  })
                              );
                          }
                        : undefined
                }
            />
            {isOpen ? (
                <VirtualItemList
                    items={samples}
                    focusedItem={view instanceof BasicSample ? view : undefined}
                    renderItem={(sample) => (
                        <SampleDisplay
                            sample={sample}
                            isSelected={selected.has(sample)}
                            onClick={(e) => onItemClick(sample, e)}
                            onContextMenu={(e) => onItemContextMenu(sample, e)}
                            onPointerDown={(e) => onItemPointerDown(sample, e)}
                            onDoubleClick={() => playSample(sample)}
                        />
                    )}
                />
            ) : null}
        </>
    );
}
