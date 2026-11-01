import type { ClipboardManager } from "../core_backend/clipboard_manager.ts";
import { type JSX, useEffect, useMemo } from "react";
import { MenuList } from "../menu_list/menu_list.tsx";
import "./bank_editor.css";
import { SoundBankInfo } from "../info_view/sound_bank_info.tsx";
import {
    BasicInstrument,
    BasicPreset,
    BasicSample,
    type GenericRange
} from "spessasynth_core";
import { PresetEditor } from "../preset_editor/preset_editor.tsx";
import { InstrumentEditor } from "../instrument_editor/instrument_editor.tsx";
import { SampleEditor } from "../sample_editor/sample_editor.tsx";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import type { HistoryActionGroup } from "../core_backend/history.ts";
import { useBankSnapshot } from "../hooks/use_bank_snapshot.ts";
import {
    BankEditorContext,
    type BankEditorContextType
} from "./bank_editor_context.ts";

export interface BankEditorProps {
    session: BankSession;
    view: BankEditView;
    setView: (view: BankEditView) => void;
    clipboardManager: ClipboardManager;
    destinationOptions: JSX.Element;
    ccOptions: JSX.Element;
    shown: boolean;
    setSplits: (s: GenericRange[]) => unknown;
}

/**
 * Falls back to the overview when the selected element is no longer in the bank,
 * for example after undoing its creation.
 */
function useResolvedView(session: BankSession, view: BankEditView) {
    const presets = useBankSnapshot(session.store, (s) => s.presets);
    const instruments = useBankSnapshot(session.store, (s) => s.instruments);
    const samples = useBankSnapshot(session.store, (s) => s.samples);
    if (view instanceof BasicPreset) {
        return presets.includes(view) ? view : "info";
    }
    if (view instanceof BasicInstrument) {
        return instruments.includes(view) ? view : "info";
    }
    if (view instanceof BasicSample) {
        return samples.includes(view) ? view : "info";
    }
    return view;
}

export function BankEditor({
    session,
    view: selectedView,
    setView,
    clipboardManager,
    destinationOptions,
    ccOptions,
    shown,
    setSplits
}: BankEditorProps) {
    const view = useResolvedView(session, selectedView);

    const context: BankEditorContextType = useMemo(
        () => ({
            session,
            setView,
            apply: (actions: HistoryActionGroup) => {
                const focus = session.history.do(actions);
                if (focus) {
                    setView(focus);
                }
            }
        }),
        [session, setView]
    );

    useEffect(() => {
        if (
            !shown ||
            (!(view instanceof BasicInstrument) &&
                !(view instanceof BasicPreset))
        ) {
            setSplits([]);
        }
    }, [setSplits, shown, view]);

    // cleanup, set no splits
    useEffect(() => {
        return () => {
            setSplits([]);
        };
    }, [setSplits]);

    return (
        <BankEditorContext value={context}>
            <div className={"main_content" + (shown ? "" : " hidden")}>
                <MenuList view={view} clipboard={clipboardManager} />
                <div className={"main_content_window"}>
                    {view === "info" && (
                        <SoundBankInfo
                            destinationOptions={destinationOptions}
                            ccOptions={ccOptions}
                            clipboard={clipboardManager}
                        />
                    )}
                    {view instanceof BasicPreset && (
                        <PresetEditor
                            preset={view}
                            setSplits={setSplits}
                            clipboardManager={clipboardManager}
                            ccOptions={ccOptions}
                            destinationOptions={destinationOptions}
                        />
                    )}
                    {view instanceof BasicInstrument && (
                        <InstrumentEditor
                            instrument={view}
                            setSplits={setSplits}
                            clipboardManager={clipboardManager}
                            ccOptions={ccOptions}
                            destinationOptions={destinationOptions}
                        />
                    )}
                    {view instanceof BasicSample && (
                        <SampleEditor sample={view} />
                    )}
                </div>
            </div>
        </BankEditorContext>
    );
}
