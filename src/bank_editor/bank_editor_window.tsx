import { BasicInstrument, BasicPreset, BasicSample } from "spessasynth_core";
import { SoundBankInfo } from "../info_view/sound_bank_info.tsx";
import { PresetEditor } from "../preset_editor/preset_editor.tsx";
import { InstrumentEditor } from "../instrument_editor/instrument_editor.tsx";
import { SampleEditor } from "../sample_editor/sample_editor.tsx";
import { ErrorBoundary } from "../error_boundary/error_boundary.tsx";
import { PaneErrorFallback } from "../error_boundary/pane_error_fallback.tsx";
import { getObjectId } from "../utils/object_id.ts";
import type { BankEditorModel } from "./use_bank_editor_model.ts";

function renderPaneError(error: unknown) {
    return <PaneErrorFallback error={error} />;
}

interface BankEditorWindowProps {
    model: BankEditorModel;
}

/**
 * The shown element's editor, the same in both layouts.
 */
export function BankEditorWindow({ model }: BankEditorWindowProps) {
    const {
        view,
        samplePlayerState,
        setSamplePlayerState,
        playRequest,
        equalizer,
        setEqualizer,
        infoPanel,
        setInfoPanel
    } = model;
    return (
        // Focusable, so a click on its text takes the focus off the page, and Delete or
        // Ctrl+V there do not act on the list's selection (see isListShortcut)
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
                {view instanceof BasicPreset && <PresetEditor preset={view} />}
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
    );
}
