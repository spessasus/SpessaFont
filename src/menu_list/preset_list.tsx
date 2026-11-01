import type { BankEditView } from "../core_backend/bank_view.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import type { ClipboardManager } from "../core_backend/clipboard_manager.ts";
import { type BasicInstrument, BasicPreset, BasicZone } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
    ESTIMATED_ROW_HEIGHT,
    type MappedPresetType,
    OVERSCAN
} from "./menu_list.tsx";
import { DropdownHeader } from "./dropdown_header/dropdown_header.tsx";
import {
    type OpenPresetDisplayType,
    PresetDisplay
} from "./preset_display/preset_display.tsx";
import { CreatePresetAction } from "./create_actions/create_preset_action.ts";
import type { HistoryAction } from "../core_backend/history.ts";
import { CreateZoneAction } from "../generator_table/create_zone_action.ts";
import toast from "react-hot-toast";

export function PresetList({
    view,
    clipboard,
    presets,
    selectedInstruments,
    selectedPresets,
    setSelectedPresets
}: {
    view: BankEditView;
    clipboard: ClipboardManager;
    presets: MappedPresetType[];
    selectedInstruments: Set<BasicInstrument>;
    selectedPresets: Set<BasicPreset>;
    setSelectedPresets: (p: Set<BasicPreset>) => unknown;
}) {
    const { t } = useTranslation();
    const { session, apply, setView } = useBankEditor();
    const [showPresets, setShowPresets] = useState(view instanceof BasicPreset);
    // keep open states for instruments and presets
    const [openPresets, setOpenPresets] = useState<
        Record<string, OpenPresetDisplayType>
    >({});

    // virtualize
    const presetsParentRef = useRef<HTMLDivElement>(null);
    const presetsVirtualizer = useVirtualizer({
        count: presets.length,
        getScrollElement: () => presetsParentRef.current,
        estimateSize: () => ESTIMATED_ROW_HEIGHT,
        overscan: OVERSCAN
    });

    // update selected presets based on view
    useEffect(() => {
        if (view instanceof BasicPreset) {
            setShowPresets(true);
            if (!selectedPresets.has(view)) {
                setSelectedPresets(new Set<BasicPreset>([view]));
            }
            setTimeout(
                () =>
                    presetsVirtualizer.scrollToIndex(
                        presets.findIndex((p) => p.preset === view)
                    ),
                100
            );
        } else if (selectedPresets.size > 0) {
            setSelectedPresets(new Set<BasicPreset>());
        }
    }, [
        presets,
        presetsVirtualizer,
        selectedPresets,
        setSelectedPresets,
        view
    ]);

    const handleClick = useCallback(
        (
            e: React.MouseEvent<HTMLDivElement, MouseEvent>,
            preset: MappedPresetType
        ) => {
            const newSet = new Set<BasicPreset>([preset.preset]);
            if (e.shiftKey && view instanceof BasicPreset) {
                const viewIndex = presets.findIndex((p) => p.preset === view);
                const presetIndex = presets.indexOf(preset);
                const start = Math.min(viewIndex, presetIndex);
                const end = Math.max(viewIndex, presetIndex);
                const range = presets.slice(start, end + 1);
                for (const i of range) newSet.add(i.preset);
            } else if (e.ctrlKey && view instanceof BasicPreset) {
                for (const i of selectedPresets) newSet.add(i);
                if (selectedPresets.has(preset.preset)) {
                    newSet.delete(preset.preset);
                }
            } else {
                setView(preset.preset);
            }
            setSelectedPresets(newSet);
        },
        [presets, selectedPresets, setSelectedPresets, setView, view]
    );

    const createPreset = useCallback(() => {
        const preset = new BasicPreset(session.document.bank);
        preset.name = [...selectedInstruments][0].name;
        for (const i of selectedInstruments) {
            preset.createZone(i);
        }
        let isFound = presets.some((p) => p.preset.matches(preset));
        let i = 0;
        while (isFound) {
            i++;
            preset.bankMSB = i & 0x7f;
            preset.bankLSB = Math.max(i >> 7, 0);
            isFound = presets.some((p) => p.preset.matches(preset));
        }
        apply([new CreatePresetAction(preset)]);
    }, [apply, presets, selectedInstruments, session.document.bank]);

    const linkInstruments = useCallback(
        (preset: BasicPreset) => {
            const actions: HistoryAction[] = Array.from(
                selectedInstruments,
                (inst) => new CreateZoneAction(preset, new BasicZone(), inst)
            );
            apply(actions);
        },
        [apply, selectedInstruments]
    );

    return (
        <>
            <DropdownHeader
                add={selectedInstruments.size > 0}
                copy={selectedPresets.size > 0}
                paste={clipboard.hasPresets()}
                onCopy={() => {
                    clipboard.copyPresets(selectedPresets);
                    // The clipboard is not observable yet, so a new selection set re-renders the paste button
                    setSelectedPresets(new Set(selectedPresets));
                    toast.success(
                        t("clipboardLocale.copiedPresets", {
                            count: selectedPresets.size
                        })
                    );
                }}
                onPaste={() => {
                    apply(clipboard.pastePresets(session.document));
                    toast.success(
                        t("clipboardLocale.pastedPresets", {
                            count: clipboard.presetCount
                        })
                    );
                }}
                onAdd={createPreset}
                onClick={() => setShowPresets(!showPresets)}
                open={showPresets}
                text={t("presetList.presets")}
            />
            {showPresets && (
                <div className={"menu_list_scrollable"} ref={presetsParentRef}>
                    <div
                        className={"item_group"}
                        style={{
                            height: `${presetsVirtualizer.getTotalSize()}px`
                        }}
                    >
                        {presetsVirtualizer.getVirtualItems().map((row) => {
                            const p = presets[row.index];
                            return (
                                <div
                                    key={row.key}
                                    ref={presetsVirtualizer.measureElement}
                                    data-index={row.index}
                                    className={"virtual_item"}
                                    style={{
                                        transform: `translateY(${row.start}px)`
                                    }}
                                >
                                    <PresetDisplay
                                        openedData={
                                            openPresets[p.searchString] ?? false
                                        }
                                        setOpenedData={(o) =>
                                            setOpenPresets((prev) => ({
                                                ...prev,
                                                [p.searchString]: o
                                            }))
                                        }
                                        onClick={(e) => handleClick(e, p)}
                                        p={p}
                                        setView={setView}
                                        view={view}
                                        selected={selectedPresets.has(p.preset)}
                                        link={selectedInstruments.size > 0}
                                        onLink={() => linkInstruments(p.preset)}
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
