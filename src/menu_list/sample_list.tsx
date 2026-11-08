import { getObjectId } from "../utils/object_id.ts";
import { BasicSample } from "spessasynth_core";
import { type MouseEvent, type PointerEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { DropdownHeader } from "./dropdown_header/dropdown_header.tsx";
import type { BankEditView, BankEntity } from "../core_backend/bank_view.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useClipboard } from "../clipboard/clipboard_context.ts";
import { SampleDisplay } from "./sample_display/sample_display.tsx";
import { PhoneSampleRow } from "./sample_display/phone_sample_row.tsx";
import { useLayout } from "../layout/layout_context.ts";
import { pickFiles } from "../utils/pick_file.ts";
import { useSampleImport } from "./use_sample_import.ts";
import { type FocusRequest, VirtualItemList } from "./virtual_item_list.tsx";
import { useSelectionCommands } from "./use_selection_commands.ts";
import { logError } from "../utils/core_utils.ts";

interface SampleListProps {
    samples: readonly BasicSample[];
    view: BankEditView;
    selected: ReadonlySet<BasicSample>;
    /**
     * The element the keyboard is on, kept in view.
     */
    cursor: BankEntity | undefined;
    focusRequest: FocusRequest | null;
    onItemClick: (sample: BasicSample, event: MouseEvent) => void;
    onItemContextMenu: (sample: BasicSample, event: MouseEvent) => void;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    /**
     * Enters selection mode from the section menu's Select….
     */
    onStartSelection: () => void;
    /**
     * Whether the phone's selection mode is on, which shows a checkbox on each row.
     */
    isSelecting: boolean;
    /**
     * The estimated row height in pixels, for the virtual list.
     */
    rowEstimate?: number;
    onItemPointerDown: (sample: BasicSample, event: PointerEvent) => void;
}

export function SampleList({
    samples,
    view,
    selected,
    cursor,
    focusRequest,
    onItemClick,
    onItemContextMenu,
    onItemPointerDown,
    isOpen,
    onOpenChange,
    onStartSelection,
    isSelecting,
    rowEstimate
}: SampleListProps) {
    const { t } = useTranslation();
    const importSamples = useSampleImport();
    const { session, apply, playSample } = useBankEditor();
    const { contents } = useClipboard();
    const commands = useSelectionCommands();
    const layout = useLayout();
    const [isImporting, setIsImporting] = useState(false);

    // One import at a time, a second one would race the first for the free names
    const addSamples = async () => {
        const files = await pickFiles("audio/*");
        if (files.length === 0) {
            return;
        }
        setIsImporting(true);
        try {
            if ((await importSamples(files, session.document, apply)) > 0) {
                onOpenChange(true);
            }
        } catch (error) {
            logError("Failed to import the audio files.", error);
            toast.error(String(error));
            toast.error(t("errorBoundary.actionFailed"));
        }
        setIsImporting(false);
    };

    return (
        <>
            <DropdownHeader
                text={t("presetList.samples")}
                isOpen={isOpen}
                onToggle={() => onOpenChange(!isOpen)}
                addLabel={t("presetList.importSamples")}
                onAdd={isImporting ? undefined : () => void addSamples()}
                onCopy={
                    selected.size > 0
                        ? () => commands.copy(selected)
                        : undefined
                }
                onPaste={contents.samples > 0 ? commands.paste : undefined}
                onSelect={onStartSelection}
                count={samples.length}
            />
            {isOpen ? (
                <VirtualItemList
                    items={samples}
                    focusedItem={
                        cursor instanceof BasicSample ? cursor : undefined
                    }
                    focusRequest={focusRequest}
                    rowEstimate={rowEstimate}
                    renderItem={(sample) => {
                        const rowProps = {
                            sampleId: getObjectId(sample),
                            isSelected: selected.has(sample),
                            isShown: view === sample,
                            onClick: (e: MouseEvent) => onItemClick(sample, e),
                            onContextMenu: (e: MouseEvent) =>
                                onItemContextMenu(sample, e),
                            onPointerDown: (e: PointerEvent) =>
                                onItemPointerDown(sample, e)
                        };
                        return layout === "phone" ? (
                            <PhoneSampleRow
                                {...rowProps}
                                isSelecting={isSelecting}
                                onPlay={() => playSample(sample)}
                            />
                        ) : (
                            <SampleDisplay
                                {...rowProps}
                                onDoubleClick={() => playSample(sample)}
                            />
                        );
                    }}
                />
            ) : null}
        </>
    );
}
