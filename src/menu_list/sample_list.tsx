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
import { pickFiles } from "../utils/pick_file.ts";
import { useSampleImport } from "./use_sample_import.ts";
import { type FocusRequest, VirtualItemList } from "./virtual_item_list.tsx";
import { useSectionOpen } from "./use_list_state.ts";
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
    onItemPointerDown
}: SampleListProps) {
    const { t } = useTranslation();
    const importSamples = useSampleImport();
    const { session, apply, playSample } = useBankEditor();
    const { contents } = useClipboard();
    const commands = useSelectionCommands();
    const [isOpen, setIsOpen] = useSectionOpen(
        view,
        view instanceof BasicSample
    );
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
                setIsOpen(true);
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
                onToggle={() => setIsOpen((open) => !open)}
                addLabel={t("presetList.importSamples")}
                onAdd={isImporting ? undefined : () => void addSamples()}
                onCopy={
                    selected.size > 0
                        ? () => commands.copy(selected)
                        : undefined
                }
                onPaste={contents.samples > 0 ? commands.paste : undefined}
            />
            {isOpen ? (
                <VirtualItemList
                    items={samples}
                    focusedItem={
                        cursor instanceof BasicSample ? cursor : undefined
                    }
                    focusRequest={focusRequest}
                    renderItem={(sample) => (
                        <SampleDisplay
                            sampleId={getObjectId(sample)}
                            isSelected={selected.has(sample)}
                            isShown={view === sample}
                            onClick={(e) => onItemClick(sample, e)}
                            onContextMenu={(e) => onItemContextMenu(sample, e)}
                            onPointerDown={(e) => onItemPointerDown(sample, e)}
                            onDoubleClick={() => playSample(sample)}
                        />
                    )}
                />
            ) : null}
        </>
    );
}
