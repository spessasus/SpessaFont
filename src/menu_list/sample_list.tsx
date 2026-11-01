import { BasicSample, EmptySample, SampleTypes } from "spessasynth_core";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { DropdownHeader } from "./dropdown_header/dropdown_header.tsx";
import { CreateSampleAction } from "./create_actions/create_sample_action.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useClipboard } from "../clipboard/clipboard_context.ts";
import { SampleDisplay } from "./sample_display/sample_display.tsx";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import { logError } from "../utils/core_utils.ts";
import { pickFile } from "../utils/pick_file.ts";
import { VirtualItemList } from "./virtual_item_list.tsx";
import { useSectionOpen } from "./use_list_state.ts";

/**
 * Sample names leave room for the "L" or "R" of a stereo pair.
 */
const MAX_BASE_NAME_LENGTH = 39;

interface SampleListProps {
    samples: readonly BasicSample[];
    view: BankEditView;
    selected: ReadonlySet<BasicSample>;
    onItemClick: (sample: BasicSample, event: MouseEvent) => void;
}

export function SampleList({
    samples,
    view,
    selected,
    onItemClick
}: SampleListProps) {
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();
    const { session, apply } = useBankEditor();
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
        let audioBuffer: AudioBuffer;
        try {
            audioBuffer = await audioEngine.context.decodeAudioData(
                await file.arrayBuffer()
            );
        } catch (error) {
            logError("Failed to decode the audio file.", error);
            toast.error(t("sampleLocale.tools.invalidAudioFile"));
            return;
        }
        const dotIndex = file.name.lastIndexOf(".");
        const baseName = (
            dotIndex === -1 ? file.name : file.name.slice(0, dotIndex)
        ).slice(0, MAX_BASE_NAME_LENGTH);
        const isStereo = audioBuffer.numberOfChannels > 1;

        const sample = new EmptySample();
        sample.name = baseName + (isStereo ? "L" : "");
        sample.setAudioData(
            audioBuffer.getChannelData(0),
            audioBuffer.sampleRate
        );
        const actions = [new CreateSampleAction(sample)];
        if (isStereo) {
            const right = new EmptySample();
            right.name = baseName + "R";
            right.setAudioData(
                audioBuffer.getChannelData(1),
                audioBuffer.sampleRate
            );
            right.setLinkedSample(sample, SampleTypes.rightSample);
            actions.push(new CreateSampleAction(right));
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
                        />
                    )}
                />
            ) : null}
        </>
    );
}
