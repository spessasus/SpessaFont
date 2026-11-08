import { MenuList } from "../menu_list/menu_list.tsx";
import "./bank_editor.css";
import { SoundBankInfo } from "../info_view/sound_bank_info.tsx";
import { BasicInstrument, BasicPreset, BasicSample } from "spessasynth_core";
import { PresetEditor } from "../preset_editor/preset_editor.tsx";
import { InstrumentEditor } from "../instrument_editor/instrument_editor.tsx";
import { SampleEditor } from "../sample_editor/sample_editor.tsx";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { BankEditorContext } from "./bank_editor_context.ts";
import { useBankEditorModel } from "./use_bank_editor_model.ts";
import { ErrorBoundary } from "../error_boundary/error_boundary.tsx";
import { PaneErrorFallback } from "../error_boundary/pane_error_fallback.tsx";
import { getObjectId } from "../utils/object_id.ts";

function renderPaneError(error: unknown) {
    return <PaneErrorFallback error={error} />;
}

export interface BankEditorProps {
    session: BankSession;
    view: BankEditView;
    onViewChange: (view: BankEditView) => void;
    /**
     * The settings are drawn over the editor, which turns its shortcuts off.
     */
    isCovered: boolean;
}

export function BankEditor({
    session,
    view: selectedView,
    onViewChange,
    isCovered
}: BankEditorProps) {
    const {
        view,
        context,
        samplePlayerState,
        setSamplePlayerState,
        playRequest,
        equalizer,
        setEqualizer,
        infoPanel,
        setInfoPanel
    } = useBankEditorModel(session, selectedView, onViewChange);

    return (
        <BankEditorContext value={context}>
            <div className={"bank_editor_content"}>
                <MenuList view={view} isCovered={isCovered} />
                {/* Focusable, so a click on its text takes the focus off the page, and Delete or
                    Ctrl+V there do not act on the list's selection (see isListShortcut) */}
                <div className={"bank_editor_window"} tabIndex={-1}>
                    {/* A failing editor resets when another element is shown */}
                    <ErrorBoundary
                        key={view === "info" ? "info" : getObjectId(view)}
                        fallback={renderPaneError}
                    >
                        {view === "info" && (
                            <SoundBankInfo
                                panel={infoPanel}
                                onPanelChange={setInfoPanel}
                            />
                        )}
                        {view instanceof BasicPreset && (
                            <PresetEditor preset={view} />
                        )}
                        {view instanceof BasicInstrument && (
                            <InstrumentEditor instrument={view} />
                        )}
                        {view instanceof BasicSample && (
                            <SampleEditor
                                sample={view}
                                playerState={samplePlayerState}
                                playRequest={playRequest}
                                onPlayerStateChange={setSamplePlayerState}
                                equalizer={equalizer}
                                onEqualizerChange={setEqualizer}
                            />
                        )}
                    </ErrorBoundary>
                </div>
            </div>
        </BankEditorContext>
    );
}
