import SoundBankManager, {
    type BankEditView
} from "../core_backend/sound_bank_manager.ts";
import type { SetViewType } from "../bank_editor/bank_editor.tsx";
import {
    BasicInstrument,
    type BasicSample,
    BasicZone,
    generatorTypes,
    sampleTypes
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
    setView,
    clipboard,
    instruments,
    setSamples,
    setInstruments,
    manager,
    setSelectedInstruments,
    selectedInstruments,
    selectedSamples
}: {
    view: BankEditView;
    setView: SetViewType;
    clipboard: ClipboardManager;
    instruments: BasicInstrument[];
    setSamples: (s: BasicSample[]) => unknown;
    setInstruments: (i: BasicInstrument[]) => unknown;
    manager: SoundBankManager;
    selectedInstruments: Set<BasicInstrument>;
    selectedSamples: Set<BasicSample>;
    setSelectedInstruments: (i: Set<BasicInstrument>) => unknown;
}) {
    const { t } = useTranslation();
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
            const newSet = new Set<BasicInstrument>();
            newSet.add(inst);
            if (e.shiftKey && view instanceof BasicInstrument) {
                const viewIndex = instruments.indexOf(view);
                const instIndex = instruments.indexOf(inst);
                const start = Math.min(viewIndex, instIndex);
                const end = Math.max(viewIndex, instIndex);
                instruments.slice(start, end + 1).forEach((i) => newSet.add(i));
            } else if (e.ctrlKey && view instanceof BasicInstrument) {
                selectedInstruments.forEach((i) => newSet.add(i));
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
        if (firstSample.linkedSample) {
            instrument.instrumentName = firstSample.sampleName.replace(
                STEREO_REGEX,
                ""
            );
        } else {
            instrument.instrumentName = firstSample.sampleName;
        }
        // add loop for convenience
        instrument.globalZone.setGenerator(generatorTypes.sampleModes, 1);
        samplesToAdd.forEach((s) => {
            const zone = instrument.createZone();
            zone.setSample(s);
            // sample types!
            if (s.sampleType === sampleTypes.leftSample) {
                zone.setGenerator(generatorTypes.pan, -500);
            } else if (s.sampleType === sampleTypes.rightSample) {
                zone.setGenerator(generatorTypes.pan, 500);
            }
        });
        const action = new CreateInstrumentAction(
            instrument,
            setInstruments,
            setView
        );
        manager.modifyBank([action]);
    }, [manager, selectedSamples, setInstruments, setView]);

    const linkSamples = useCallback(
        (inst: BasicInstrument) => {
            const actions: HistoryAction[] = [];
            const ordered = addAndReorderStereoSamples(selectedSamples);
            ordered.forEach((sample) => {
                const zone = new BasicZone();
                if (sample.sampleType === sampleTypes.leftSample) {
                    zone.setGenerator(generatorTypes.pan, -500);
                } else if (sample.sampleType === sampleTypes.rightSample) {
                    zone.setGenerator(generatorTypes.pan, 500);
                }
                actions.push(
                    new CreateZoneAction<BasicInstrument, BasicSample>(
                        inst,
                        zone,
                        sample,
                        () => {
                            setInstruments([...instruments]);
                            setView(inst);
                        }
                    )
                );
            });
            manager.modifyBank(actions);
        },
        [instruments, manager, selectedSamples, setInstruments, setView]
    );

    const link = selectedSamples.size > 0;
    return (
        <>
            <DropdownHeader
                add={selectedSamples.size > 0}
                copy={selectedInstruments.size > 0}
                onCopy={() => {
                    clipboard.copyInstruments(selectedInstruments);
                    setInstruments([...manager.instruments]);
                    toast.success(
                        t("clipboardLocale.copiedInstruments", {
                            count: selectedInstruments.size
                        })
                    );
                }}
                onPaste={() => {
                    const count = clipboard.pasteInstruments(
                        manager,
                        setSamples,
                        setInstruments,
                        setView
                    );
                    setInstruments([
                        ...manager.instruments.toSorted((a, b) =>
                            a.instrumentName > b.instrumentName
                                ? 1
                                : b.instrumentName > a.instrumentName
                                  ? -1
                                  : 0
                        )
                    ]);
                    toast.success(
                        t("clipboardLocale.pastedInstruments", {
                            count
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
                                            openInstruments[
                                                inst.instrumentName
                                            ] ?? false
                                        }
                                        setOpen={(o) =>
                                            setOpenInstruments((prev) => ({
                                                ...prev,
                                                [inst.instrumentName]: o
                                            }))
                                        }
                                        selected={selectedInstruments.has(inst)}
                                        view={view}
                                        instrument={inst}
                                        onClick={(e) => handleClick(e, inst)}
                                        setView={setView}
                                        link={link}
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
