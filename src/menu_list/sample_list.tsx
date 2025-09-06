import { BasicSample, EmptySample, sampleTypes } from "spessasynth_core";
import { DropdownHeader } from "./dropdown_header/dropdown_header.tsx";
import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ESTIMATED_ROW_HEIGHT, OVERSCAN } from "./menu_list.tsx";
import { useTranslation } from "react-i18next";
import SoundBankManager, {
    type BankEditView
} from "../core_backend/sound_bank_manager.ts";
import { CreateSampleAction } from "./create_actions/create_sample_action.ts";
import type { AudioEngine } from "../core_backend/audio_engine.ts";
import type { SetViewType } from "../bank_editor/bank_editor.tsx";
import type { ClipboardManager } from "../core_backend/clipboard_manager.ts";
import { SampleDisplay } from "./sample_display/sample_display.tsx";
import toast from "react-hot-toast";

export function SampleList({
    samples,
    view,
    setView,
    manager,
    engine,
    setSamples,
    clipboard,
    selectedSamples,
    setSelectedSamples
}: {
    samples: BasicSample[];
    view: BankEditView;
    setView: SetViewType;
    manager: SoundBankManager;
    engine: AudioEngine;
    setSamples: (s: BasicSample[]) => unknown;
    clipboard: ClipboardManager;
    selectedSamples: Set<BasicSample>;
    setSelectedSamples: (s: Set<BasicSample>) => unknown;
}) {
    const { t } = useTranslation();
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
                audioBuffer = await engine.context.decodeAudioData(buffer);
            } catch {
                toast.error(t("sampleLocale.tools.invalidAudioFile"));
                return;
            }
            const out = audioBuffer.getChannelData(0);
            let sampleName = file.name;
            const lastDotIndex = sampleName.lastIndexOf(".");
            if (lastDotIndex !== -1) {
                sampleName = sampleName.substring(0, lastDotIndex);
            }
            sampleName = sampleName.substring(0, 39); // keep spare space for "R" or "L"

            const sample = new EmptySample();
            sample.name =
                sampleName + (audioBuffer.numberOfChannels > 1 ? "L" : "");
            sample.setAudioData(out, audioBuffer.sampleRate);
            const actions = [
                new CreateSampleAction(sample, setSamples, setView)
            ];
            // add the stereo sample if more channels
            if (audioBuffer.numberOfChannels > 1) {
                const otherOut = audioBuffer.getChannelData(1);
                const sample2 = new EmptySample();
                sample2.name = sampleName + "R";
                sample2.setAudioData(otherOut, audioBuffer.sampleRate);
                sample2.setLinkedSample(sample, sampleTypes.rightSample);
                actions.push(
                    new CreateSampleAction(sample2, setSamples, setView)
                );
            }
            manager.modifyBank(actions);
            setShowSamples(true);
        };
        input.click();
    }, [engine.context, manager, setSamples, setView, t]);

    const handleClick = (
        e: React.MouseEvent<HTMLDivElement, MouseEvent>,
        sample: BasicSample
    ) => {
        const newSet = new Set<BasicSample>();
        newSet.add(sample);
        if (e.shiftKey && view instanceof BasicSample) {
            const viewIndex = samples.indexOf(view);
            const sampleIndex = samples.indexOf(sample);
            const start = Math.min(viewIndex, sampleIndex);
            const end = Math.max(viewIndex, sampleIndex);
            samples.slice(start, end + 1).forEach((s) => newSet.add(s));
        } else if (e.ctrlKey && view instanceof BasicSample) {
            selectedSamples.forEach((s) => newSet.add(s));
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
                    setSamples([...manager.samples]);
                    toast.success(
                        t("clipboardLocale.copiedSamples", {
                            count: selectedSamples.size
                        })
                    );
                }}
                paste={clipboard.hasSamples()}
                onPaste={() => {
                    clipboard.pasteSamples(manager, setSamples, setView);
                    setSamples([
                        ...manager.samples.toSorted((a, b) =>
                            a.name > b.name ? 1 : b.name > a.name ? -1 : 0
                        )
                    ]);
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
