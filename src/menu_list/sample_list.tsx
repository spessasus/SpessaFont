import { BasicSample, EmptySample, SampleTypes } from "spessasynth_core";
import { DropdownHeader } from "./dropdown_header/dropdown_header.tsx";
import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ESTIMATED_ROW_HEIGHT, OVERSCAN } from "./menu_list.tsx";
import { useTranslation } from "react-i18next";
import { CreateSampleAction } from "./create_actions/create_sample_action.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import type { ClipboardManager } from "../core_backend/clipboard_manager.ts";
import { SampleDisplay } from "./sample_display/sample_display.tsx";
import toast from "react-hot-toast";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import { logError } from "../utils/core_utils.ts";

export function SampleList({
    samples,
    view,
    clipboard,
    selectedSamples,
    setSelectedSamples
}: {
    samples: readonly BasicSample[];
    view: BankEditView;
    clipboard: ClipboardManager;
    selectedSamples: Set<BasicSample>;
    setSelectedSamples: (s: Set<BasicSample>) => unknown;
}) {
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();
    const { session, apply, setView } = useBankEditor();
    const [showSamples, setShowSamples] = useState(view instanceof BasicSample);
    const samplesParentRef = useRef<HTMLDivElement>(null);
    const samplesVirtualizer = useVirtualizer({
        count: samples.length,
        getScrollElement: () => samplesParentRef.current,
        estimateSize: () => ESTIMATED_ROW_HEIGHT,
        overscan: OVERSCAN
    });

    useEffect(() => {
        if (view instanceof BasicSample) {
            if (!selectedSamples.has(view)) {
                setSelectedSamples(new Set<BasicSample>([view]));
            }
            setShowSamples(true);
            setTimeout(
                () => samplesVirtualizer.scrollToIndex(samples.indexOf(view)),
                100
            );
        } else if (selectedSamples.size > 0) {
            setSelectedSamples(new Set<BasicSample>());
        }
    }, [
        samples,
        samplesVirtualizer,
        selectedSamples,
        setSelectedSamples,
        view
    ]);

    const addSample = useCallback(() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "audio/*";
        input.onchange = async () => {
            const file = input?.files?.[0];
            if (!file) {
                return;
            }
            const buffer = await file.arrayBuffer();
            let audioBuffer: AudioBuffer;
            try {
                audioBuffer = await audioEngine.context.decodeAudioData(buffer);
            } catch (error) {
                logError("Failed to decode the audio file.", error);
                toast.error(t("sampleLocale.tools.invalidAudioFile"));
                return;
            }
            const out = audioBuffer.getChannelData(0);
            let sampleName = file.name;
            const lastDotIndex = sampleName.lastIndexOf(".");
            if (lastDotIndex !== -1) {
                sampleName = sampleName.slice(0, Math.max(0, lastDotIndex));
            }
            sampleName = sampleName.slice(0, 39); // keep spare space for "R" or "L"

            const sample = new EmptySample();
            sample.name =
                sampleName + (audioBuffer.numberOfChannels > 1 ? "L" : "");
            sample.setAudioData(out, audioBuffer.sampleRate);
            const actions = [new CreateSampleAction(sample)];
            // add the stereo sample if more channels
            if (audioBuffer.numberOfChannels > 1) {
                const otherOut = audioBuffer.getChannelData(1);
                const sample2 = new EmptySample();
                sample2.name = sampleName + "R";
                sample2.setAudioData(otherOut, audioBuffer.sampleRate);
                sample2.setLinkedSample(sample, SampleTypes.rightSample);
                actions.push(new CreateSampleAction(sample2));
            }
            apply(actions);
            setShowSamples(true);
        };
        input.click();
    }, [apply, audioEngine.context, t]);

    const handleClick = (
        e: React.MouseEvent<HTMLDivElement, MouseEvent>,
        sample: BasicSample
    ) => {
        const newSet = new Set<BasicSample>([sample]);
        if (e.shiftKey && view instanceof BasicSample) {
            const viewIndex = samples.indexOf(view);
            const sampleIndex = samples.indexOf(sample);
            const start = Math.min(viewIndex, sampleIndex);
            const end = Math.max(viewIndex, sampleIndex);
            const range = samples.slice(start, end + 1);
            for (const s of range) newSet.add(s);
        } else if (e.ctrlKey && view instanceof BasicSample) {
            for (const s of selectedSamples) newSet.add(s);
            if (selectedSamples.has(sample)) {
                newSet.delete(sample);
            }
        } else {
            setView(sample);
        }
        setSelectedSamples(newSet);
    };

    return (
        <>
            <DropdownHeader
                onAdd={addSample}
                onClick={() => setShowSamples(!showSamples)}
                text={t("presetList.samples")}
                open={showSamples}
                copy={selectedSamples.size > 0}
                onCopy={() => {
                    clipboard.copySamples(selectedSamples);
                    // The clipboard is not observable yet, so a new selection set re-renders the paste button
                    setSelectedSamples(new Set(selectedSamples));
                    toast.success(
                        t("clipboardLocale.copiedSamples", {
                            count: selectedSamples.size
                        })
                    );
                }}
                paste={clipboard.hasSamples()}
                onPaste={() => {
                    apply(clipboard.pasteSamples(session.document));
                    toast.success(
                        t("clipboardLocale.pastedSamples", {
                            count: clipboard.sampleCount
                        })
                    );
                }}
            />
            {showSamples && (
                <div className="menu_list_scrollable" ref={samplesParentRef}>
                    <div
                        className="item_group"
                        style={{
                            height: `${samplesVirtualizer.getTotalSize()}px`
                        }}
                    >
                        {samplesVirtualizer.getVirtualItems().map((row) => {
                            const sample = samples[row.index];
                            return (
                                <div
                                    key={row.key}
                                    ref={samplesVirtualizer.measureElement}
                                    data-index={row.index}
                                    className={"virtual_item"}
                                    style={{
                                        transform: `translateY(${row.start}px)`
                                    }}
                                >
                                    <SampleDisplay
                                        selected={selectedSamples.has(sample)}
                                        sample={sample}
                                        onClick={(e) => handleClick(e, sample)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
}
