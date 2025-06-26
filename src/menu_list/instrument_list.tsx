import SoundBankManager, {
    type BankEditView
} from "../core_backend/sound_bank_manager.ts";
import type { SetViewType } from "../bank_editor/bank_editor.tsx";
import { BasicInstrument } from "spessasynth_core";
import type { ClipboardManager } from "../core_backend/clipboard_manager.ts";
import { DropdownHeader } from "./dropdown_header/dropdown_header.tsx";
import { InstrumentDisplay } from "./instrument_display/instrument_display.tsx";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ESTIMATED_ROW_HEIGHT, OVERSCAN } from "./menu_list.tsx";

export function InstrumentList({
    view,
    setView,
    clipboard,
    instruments,
    setInstruments,
    manager
}: {
    view: BankEditView;
    setView: SetViewType;
    clipboard: ClipboardManager;
    instruments: BasicInstrument[];
    setInstruments: (i: BasicInstrument[]) => unknown;
    manager: SoundBankManager;
}) {
    const { t } = useTranslation();
    const [showInstruments, setShowInstruments] = useState(
        view instanceof BasicInstrument
    );
    // keep open states for instruments
    const [openInstruments, setOpenInstruments] = useState<
        Record<string, boolean>
    >({});
    const [selectedInstruments, setSelectedInstruments] = useState(
        new Set<BasicInstrument>()
    );

    // virtualize
    const instrumentsParentRef = useRef<HTMLDivElement>(null);
    const instrumentsVirtualizer = useVirtualizer({
        count: instruments.length,
        getScrollElement: () => instrumentsParentRef.current,
        estimateSize: () => ESTIMATED_ROW_HEIGHT,
        overscan: OVERSCAN
    });

    useEffect(() => {
        if (!(view instanceof BasicInstrument)) {
            setSelectedInstruments(new Set<BasicInstrument>());
        } else {
            setShowInstruments(true);
            setSelectedInstruments(new Set<BasicInstrument>([view]));
            setTimeout(() => {
                instrumentsVirtualizer.scrollToIndex(instruments.indexOf(view));
            }, 100);
        }
    }, [instruments, instrumentsVirtualizer, view]);

    const handleClick = (
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
    };

    return (
        <>
            <DropdownHeader
                copy={selectedInstruments.size > 0}
                onCopy={() => {
                    clipboard.copyInstruments(Array.from(selectedInstruments));
                    setInstruments([...manager.instruments]);
                }}
                onPaste={() => {
                    clipboard.pasteInstruments(manager);
                    setInstruments([...manager.instruments]);
                }}
                paste={clipboard.hasInstruments()}
                onAdd={() => console.log("add instrument")}
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
