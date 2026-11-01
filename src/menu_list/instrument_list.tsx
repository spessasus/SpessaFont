import type { BankEditView } from "../core_backend/bank_view.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import {
    BasicInstrument,
    type BasicSample,
    BasicZone,
    GeneratorTypes,
    SampleTypes
} from "spessasynth_core";
import type { ClipboardManager } from "../core_backend/clipboard_manager.ts";
import { DropdownHeader } from "./dropdown_header/dropdown_header.tsx";
import { InstrumentDisplay } from "./instrument_display/instrument_display.tsx";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ESTIMATED_ROW_HEIGHT, OVERSCAN } from "./menu_list.tsx";
import { CreateInstrumentAction } from "./create_actions/create_instrument_action.ts";
import { STEREO_REGEX } from "../utils/stereo_regex.ts";
import type { HistoryAction } from "../core_backend/history.ts";
import { CreateZoneAction } from "../generator_table/create_zone_action.ts";
import { addAndReorderStereoSamples } from "../utils/add_stereo_samples.ts";
import toast from "react-hot-toast";

export function InstrumentList({
    view,
    clipboard,
    instruments,
    setSelectedInstruments,
    selectedInstruments,
    selectedSamples
}: {
    view: BankEditView;
    clipboard: ClipboardManager;
    instruments: readonly BasicInstrument[];
    selectedInstruments: Set<BasicInstrument>;
    selectedSamples: Set<BasicSample>;
    setSelectedInstruments: (i: Set<BasicInstrument>) => unknown;
}) {
    const { t } = useTranslation();
    const { session, apply, setView } = useBankEditor();
    const [showInstruments, setShowInstruments] = useState(
        view instanceof BasicInstrument
    );

    useEffect(() => {
        if (view instanceof BasicInstrument) {
            setSelectedInstruments(new Set<BasicInstrument>([view]));
        }
    }, [setSelectedInstruments, view]);

    // keep open states for instruments
    const [openInstruments, setOpenInstruments] = useState<
        Record<string, boolean>
    >({});

    // virtualize
    const instrumentsParentRef = useRef<HTMLDivElement>(null);
    const instrumentsVirtualizer = useVirtualizer({
        count: instruments.length,
        getScrollElement: () => instrumentsParentRef.current,
        estimateSize: () => ESTIMATED_ROW_HEIGHT,
        overscan: OVERSCAN
    });

    useEffect(() => {
        if (view instanceof BasicInstrument) {
            setShowInstruments(true);
            if (!selectedInstruments.has(view)) {
                setSelectedInstruments(new Set<BasicInstrument>([view]));
            }
            setTimeout(() => {
                instrumentsVirtualizer.scrollToIndex(instruments.indexOf(view));
            }, 100);
        } else if (selectedInstruments.size > 0) {
            setSelectedInstruments(new Set<BasicInstrument>());
        }
    }, [
        instruments,
        instrumentsVirtualizer,
        selectedInstruments,
        setSelectedInstruments,
        view
    ]);

    const handleClick = useCallback(
        (
            e: React.MouseEvent<HTMLDivElement, MouseEvent>,
            inst: BasicInstrument
        ) => {
            const newSet = new Set<BasicInstrument>([inst]);
            if (e.shiftKey && view instanceof BasicInstrument) {
                const viewIndex = instruments.indexOf(view);
                const instIndex = instruments.indexOf(inst);
                const start = Math.min(viewIndex, instIndex);
                const end = Math.max(viewIndex, instIndex);
                const range = instruments.slice(start, end + 1);
                for (const i of range) newSet.add(i);
            } else if (e.ctrlKey && view instanceof BasicInstrument) {
                for (const i of selectedInstruments) newSet.add(i);
                if (selectedInstruments.has(inst)) {
                    newSet.delete(inst);
                }
            } else {
                setView(inst);
            }
            setSelectedInstruments(newSet);
        },
        [
            instruments,
            selectedInstruments,
            setSelectedInstruments,
            setView,
            view
        ]
    );

    const createInstrument = useCallback(() => {
        const samplesToAdd = addAndReorderStereoSamples(selectedSamples);

        const instrument = new BasicInstrument();
        const firstSample = samplesToAdd[0];
        instrument.name = firstSample.linkedSample
            ? firstSample.name.replace(STEREO_REGEX, "")
            : firstSample.name;
        // add loop for convenience
        instrument.globalZone.setGenerator(GeneratorTypes.sampleModes, 1);
        for (const s of samplesToAdd) {
            const zone = instrument.createZone(s);
            // sample types!
            if (s.sampleType === SampleTypes.leftSample) {
                zone.setGenerator(GeneratorTypes.pan, -500);
            } else if (s.sampleType === SampleTypes.rightSample) {
                zone.setGenerator(GeneratorTypes.pan, 500);
            }
        }
        apply([new CreateInstrumentAction(instrument)]);
    }, [apply, selectedSamples]);

    const linkSamples = useCallback(
        (inst: BasicInstrument) => {
            const actions: HistoryAction[] = [];
            const ordered = addAndReorderStereoSamples(selectedSamples);
            for (const sample of ordered) {
                const zone = new BasicZone();
                if (sample.sampleType === SampleTypes.leftSample) {
                    zone.setGenerator(GeneratorTypes.pan, -500);
                } else if (sample.sampleType === SampleTypes.rightSample) {
                    zone.setGenerator(GeneratorTypes.pan, 500);
                }
                actions.push(new CreateZoneAction(inst, zone, sample));
            }
            apply(actions);
        },
        [apply, selectedSamples]
    );

    const canLink = selectedSamples.size > 0;
    return (
        <>
            <DropdownHeader
                add={selectedSamples.size > 0}
                copy={selectedInstruments.size > 0}
                onCopy={() => {
                    clipboard.copyInstruments(selectedInstruments);
                    // The clipboard is not observable yet, so a new selection set re-renders the paste button
                    setSelectedInstruments(new Set(selectedInstruments));
                    toast.success(
                        t("clipboardLocale.copiedInstruments", {
                            count: selectedInstruments.size
                        })
                    );
                }}
                onPaste={() => {
                    apply(clipboard.pasteInstruments(session.document));
                    toast.success(
                        t("clipboardLocale.pastedInstruments", {
                            count: clipboard.instrumentCount
                        })
                    );
                }}
                paste={clipboard.hasInstruments()}
                onAdd={createInstrument}
                onClick={() => setShowInstruments(!showInstruments)}
                open={showInstruments}
                text={t("presetList.instruments")}
            />
            {showInstruments && (
                <div
                    className={"menu_list_scrollable"}
                    ref={instrumentsParentRef}
                >
                    <div
                        className={"item_group"}
                        style={{
                            height: `${instrumentsVirtualizer.getTotalSize()}px`
                        }}
                    >
                        {instrumentsVirtualizer.getVirtualItems().map((row) => {
                            const inst = instruments[row.index];
                            return (
                                <div
                                    key={row.key}
                                    ref={instrumentsVirtualizer.measureElement}
                                    data-index={row.index}
                                    className={"virtual_item"}
                                    style={{
                                        transform: `translateY(${row.start}px)`
                                    }}
                                >
                                    <InstrumentDisplay
                                        open={
                                            openInstruments[inst.name] ?? false
                                        }
                                        setOpen={(o) =>
                                            setOpenInstruments((prev) => ({
                                                ...prev,
                                                [inst.name]: o
                                            }))
                                        }
                                        selected={selectedInstruments.has(inst)}
                                        view={view}
                                        instrument={inst}
                                        onClick={(e) => handleClick(e, inst)}
                                        setView={setView}
                                        link={canLink}
                                        onLink={() => linkSamples(inst)}
                                    ></InstrumentDisplay>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
}
