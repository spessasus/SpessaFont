import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MenuList } from "../menu_list/menu_list.tsx";
import "./bank_editor.css";
import { SoundBankInfo } from "../info_view/sound_bank_info.tsx";
import type { InfoPanel } from "../info_view/info_panel.ts";
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
import type { SamplePlayerState } from "../sample_editor/use_sample_player.ts";
import { DEFAULT_EQUALIZER_STATE } from "../sample_editor/equalizer/equalizer.ts";

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

/**
 * Falls back to the overview when the selected element is no longer in the bank,
 * for example after undoing its creation.
 */
function useResolvedView(session: BankSession, view: BankEditView) {
    const views = useBankSnapshot(session.store, (s) => s.views);
    if (view === "info") {
        return view;
    }
    const id = getObjectId(view);
    let isInBank: boolean;
    if (view instanceof BasicPreset) {
        isInBank = views.presets.has(id);
    } else if (view instanceof BasicInstrument) {
        isInBank = views.instruments.has(id);
    } else {
        isInBank = views.samples.has(id);
    }
    return isInBank ? view : "info";
}

export function BankEditor({
    session,
    view: selectedView,
    onViewChange,
    isCovered
}: BankEditorProps) {
    const { t } = useTranslation();
    const view = useResolvedView(session, selectedView);
    usePreviewTarget(session, view);
    const { name } = useBankSnapshot(session.store, (s) => s.info);
    const bankName = name.length > 0 ? name : t("bankInfo.unnamed");

    // The title follows the active tab, and goes back to the default when the tab closes
    useEffect(() => {
        const previousTitle = document.title;
        document.title = `SpessaFont - ${bankName}`;
        return () => {
            document.title = previousTitle;
        };
    }, [bankName]);
    // Lives here so switching samples keeps playing, and stops when no sample is shown
    const [samplePlayerState, setSamplePlayerState] =
        useState<SamplePlayerState>("stopped");
    if (samplePlayerState !== "stopped" && !(view instanceof BasicSample)) {
        setSamplePlayerState("stopped");
    }
    // Counts the requests to play from the start, so playing the shown sample again restarts it
    const [playRequest, setPlayRequest] = useState(0);
    const [equalizer, setEqualizer] = useState(DEFAULT_EQUALIZER_STATE);
    const [infoPanel, setInfoPanel] = useState<InfoPanel>("info");

    const context: BankEditorContextType = useMemo(
        () => ({
            session,
            setView: onViewChange,
            apply: (actions: HistoryActionGroup, mergeKey?: string) => {
                const focus = session.history.do(actions, mergeKey);
                if (focus) {
                    onViewChange(focus);
                }
            },
            playSample: (sample: BasicSample) => {
                onViewChange(sample);
                setSamplePlayerState("playing");
                setPlayRequest((r) => r + 1);
            }
        }),
        [session, onViewChange]
    );

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
