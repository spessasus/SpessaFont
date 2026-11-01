import { useMemo } from "react";
import { MenuList } from "../menu_list/menu_list.tsx";
import "./bank_editor.css";
import { SoundBankInfo } from "../info_view/sound_bank_info.tsx";
import { BasicInstrument, BasicPreset, BasicSample } from "spessasynth_core";
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
import { usePreviewTarget } from "./use_preview_target.ts";
import { ErrorBoundary } from "../error_boundary/error_boundary.tsx";
import { PaneErrorFallback } from "../error_boundary/pane_error_fallback.tsx";
import { getObjectId } from "../utils/object_id.ts";

function renderPaneError(error: unknown) {
    return <PaneErrorFallback error={error} />;
}

export interface BankEditorProps {
    session: BankSession;
    view: BankEditView;
    setView: (view: BankEditView) => void;
    shown: boolean;
}

/**
 * Falls back to the overview when the selected element is no longer in the bank,
 * for example after undoing its creation.
 */
function useResolvedView(session: BankSession, view: BankEditView) {
    // Subscribing to the lists re-renders when an element is added or removed
    useBankSnapshot(session.store, (s) => s.presets);
    useBankSnapshot(session.store, (s) => s.instruments);
    useBankSnapshot(session.store, (s) => s.samples);
    return view !== "info" && session.document.contains(view) ? view : "info";
}

export function BankEditor({
    session,
    view: selectedView,
    setView,
    shown
}: BankEditorProps) {
    const view = useResolvedView(session, selectedView);
    usePreviewTarget(session, view);

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

    return (
        <BankEditorContext value={context}>
            <div className={"main_content" + (shown ? "" : " hidden")}>
                <MenuList view={view} />
                <div className={"main_content_window"}>
                    {/* A failing editor resets when another element is shown */}
                    <ErrorBoundary
                        key={view === "info" ? "info" : getObjectId(view)}
                        fallback={renderPaneError}
                    >
                        {view === "info" && <SoundBankInfo />}
                        {view instanceof BasicPreset && (
                            <PresetEditor preset={view} />
                        )}
                        {view instanceof BasicInstrument && (
                            <InstrumentEditor instrument={view} />
                        )}
                        {view instanceof BasicSample && (
                            <SampleEditor sample={view} />
                        )}
                    </ErrorBoundary>
                </div>
            </div>
        </BankEditorContext>
    );
}
