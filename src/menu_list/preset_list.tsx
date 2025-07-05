import SoundBankManager, {
    type BankEditView
} from "../core_backend/sound_bank_manager.ts";
import type { SetViewType } from "../bank_editor/bank_editor.tsx";
import type { ClipboardManager } from "../core_backend/clipboard_manager.ts";
import {
    type BasicInstrument,
    BasicPreset,
    BasicSample,
    BasicZone
} from "spessasynth_core";
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
import { CreatePresetAction } from "./create_actions/create_preset_actions.ts";
import type { HistoryAction } from "../core_backend/history.ts";
import { CreateZoneAction } from "../generator_table/create_zone_action.ts";
import toast from "react-hot-toast";

export function PresetList({
    view,
    setView,
    clipboard,
    presets,
    setPresets,
    manager,
    selectedInstruments,
    setInstruments,
    setSamples,
    selectedPresets,
    setSelectedPresets
}: {
    view: BankEditView;
    setView: SetViewType;
    clipboard: ClipboardManager;
    presets: MappedPresetType[];
    setPresets: (i: BasicPreset[]) => unknown;
    setInstruments: (i: BasicInstrument[]) => unknown;
    setSamples: (s: BasicSample[]) => unknown;
    selectedInstruments: Set<BasicInstrument>;
    selectedPresets: Set<BasicPreset>;
    setSelectedPresets: (p: Set<BasicPreset>) => unknown;
    manager: SoundBankManager;
}) {
    const { t } = useTranslation();
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
            const newSet = new Set<BasicPreset>();
            newSet.add(preset.preset);
            if (e.shiftKey && view instanceof BasicPreset) {
                const viewIndex = presets.findIndex((p) => p.preset === view);
                const presetIndex = presets.indexOf(preset);
                const start = Math.min(viewIndex, presetIndex);
                const end = Math.max(viewIndex, presetIndex);
                presets
                    .slice(start, end + 1)
                    .forEach((i) => newSet.add(i.preset));
            } else if (e.ctrlKey && view instanceof BasicPreset) {
                selectedPresets.forEach((i) => newSet.add(i));
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
        const preset = new BasicPreset(manager);
        preset.presetName = [...selectedInstruments][0].instrumentName;
        selectedInstruments.forEach((i) => {
            const zone = preset.createZone();
            zone.setInstrument(i);
        });
        let found = !!presets.find(
            (p) =>
                p.preset.program === preset.program &&
                p.preset.bank === preset.bank
        );
        while (found) {
            preset.bank++;
            found = !!presets.find(
                (p) =>
                    p.preset.program === preset.program &&
                    p.preset.bank === preset.bank
            );
        }
        const action = new CreatePresetAction(preset, setPresets, setView);
        manager.modifyBank([action]);
    }, [manager, presets, selectedInstruments, setPresets, setView]);

    const linkInstruments = useCallback(
        (preset: BasicPreset) => {
            const actions: HistoryAction[] = [];
            selectedInstruments.forEach((inst) =>
                actions.push(
                    new CreateZoneAction<BasicPreset, BasicInstrument>(
                        preset,
                        new BasicZone(),
                        inst,
                        () => {
                            setPresets([...manager.presets]);
                            setView(preset);
                        }
                    )
                )
            );
            manager.modifyBank(actions);
        },
        [manager, selectedInstruments, setPresets, setView]
    );

    return (
        <>
            <DropdownHeader
                add={selectedInstruments.size > 0}
                copy={selectedPresets.size > 0}
                paste={clipboard.hasPresets()}
                onCopy={() => {
                    clipboard.copyPresets(selectedPresets);
                    setPresets([...manager.presets]);
                    toast.success(
                        t("clipboardLocale.copiedPresets", {
                            count: selectedPresets.size
                        })
                    );
                }}
                onPaste={() => {
                    const count = clipboard.pastePresets(
                        manager,
                        setPresets,
                        setInstruments,
                        setSamples,
                        setView
                    );
                    setPresets([
                        ...manager.presets.toSorted((a, b) =>
                            a.presetName > b.presetName
                                ? 1
                                : b.presetName > a.presetName
                                  ? -1
                                  : 0
                        )
                    ]);
                    toast.success(
                        t("clipboardLocale.pastedPresets", {
                            count
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
