import SoundBankManager, {
    type BankEditView
} from "../core_backend/sound_bank_manager.ts";
import type { SetViewType } from "../bank_editor/bank_editor.tsx";
import type { ClipboardManager } from "../core_backend/clipboard_manager.ts";
import { BasicPreset } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
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

export function PresetList({
    view,
    setView,
    clipboard,
    presets,
    setPresets,
    manager
}: {
    view: BankEditView;
    setView: SetViewType;
    clipboard: ClipboardManager;
    presets: MappedPresetType[];
    setPresets: (i: BasicPreset[]) => unknown;
    manager: SoundBankManager;
}) {
    const { t } = useTranslation();
    const [showPresets, setShowPresets] = useState(view instanceof BasicPreset);
    // keep open states for instruments and presets
    const [openPresets, setOpenPresets] = useState<
        Record<string, OpenPresetDisplayType>
    >({});
    const [selectedPresets, setSelectedPresets] = useState(
        new Set<MappedPresetType>()
    );

    // virtualize
    const presetsParentRef = useRef<HTMLDivElement>(null);
    const presetsVirtualizer = useVirtualizer({
        count: presets.length,
        getScrollElement: () => presetsParentRef.current,
        estimateSize: () => ESTIMATED_ROW_HEIGHT,
        overscan: OVERSCAN
    });

    useEffect(() => {
        if (!(view instanceof BasicPreset)) {
            setSelectedPresets(new Set<MappedPresetType>());
        } else {
            setShowPresets(true);
            setTimeout(
                () =>
                    presetsVirtualizer.scrollToIndex(
                        presets.findIndex((p) => p.preset === view)
                    ),
                100
            );
        }
    }, [presets, presetsVirtualizer, view]);

    const handleClick = (
        e: React.MouseEvent<HTMLDivElement, MouseEvent>,
        preset: MappedPresetType
    ) => {
        const newSet = new Set<MappedPresetType>();
        newSet.add(preset);
        if (e.shiftKey && view instanceof BasicPreset) {
            const viewIndex = presets.findIndex((p) => p.preset === view);
            const instIndex = presets.indexOf(preset);
            const start = Math.min(viewIndex, instIndex);
            const end = Math.max(viewIndex, instIndex);
            presets.slice(start, end + 1).forEach((i) => newSet.add(i));
        } else if (e.ctrlKey && view instanceof BasicPreset) {
            selectedPresets.forEach((i) => newSet.add(i));
            if (selectedPresets.has(preset)) {
                newSet.delete(preset);
            }
        } else {
            setView(preset.preset);
        }
        setSelectedPresets(newSet);
    };

    return (
        <>
            <DropdownHeader
                copy={selectedPresets.size > 0}
                paste={clipboard.hasPresets()}
                onCopy={() => {
                    clipboard.copyPresets(
                        Array.from(selectedPresets).map((p) => p.preset)
                    );
                    setPresets([...manager.presets]);
                }}
                onPaste={() => {
                    clipboard.pastePresets(manager);
                    setPresets([
                        ...manager.presets.toSorted((a, b) =>
                            a.presetName > b.presetName
                                ? 1
                                : b.presetName > a.presetName
                                  ? -1
                                  : 0
                        )
                    ]);
                }}
                onAdd={() => console.log("add preset")}
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
                                        selected={selectedPresets.has(p)}
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
