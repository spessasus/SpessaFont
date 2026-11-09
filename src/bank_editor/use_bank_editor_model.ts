import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BasicInstrument, BasicPreset, BasicSample } from "spessasynth_core";
import type { InfoPanel } from "../info_view/info_panel.ts";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import type { HistoryActionGroup } from "../core_backend/history.ts";
import { useBankSnapshot } from "../hooks/use_bank_snapshot.ts";
import type { BankEditorContextType } from "./bank_editor_context.ts";
import { usePreviewTarget } from "./use_preview_target.ts";
import { getObjectId } from "../utils/object_id.ts";
import type { SamplePlayerState } from "../sample_editor/use_sample_player.ts";
import { DEFAULT_EQUALIZER_STATE } from "../sample_editor/equalizer/equalizer.ts";
import {
    getShownSampleSection,
    type SampleSection,
    type StoredSampleSection
} from "../sample_editor/sample_section.ts";

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

/**
 * The state and wiring of one bank's editor, shared by the desktop and phone editors
 * so they only differ in markup.
 */
export function useBankEditorModel(
    session: BankSession,
    selectedView: BankEditView,
    onViewChange: (view: BankEditView) => void
) {
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
    const [storedSection, setStoredSection] = useState<StoredSampleSection>();
    const shownSampleId =
        view instanceof BasicSample ? getObjectId(view) : undefined;
    const sampleSection = getShownSampleSection(storedSection, shownSampleId);
    const setSampleSection = (section: SampleSection) => {
        if (shownSampleId !== undefined) {
            setStoredSection({ sampleId: shownSampleId, section });
        }
    };
    // The context below depends on it, so it keeps its identity
    const startPlaying = useCallback(() => {
        setSamplePlayerState("playing");
        setPlayRequest((r) => r + 1);
    }, []);

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
                startPlaying();
            }
        }),
        [session, onViewChange, startPlaying]
    );

    return {
        view,
        context,
        samplePlayerState,
        setSamplePlayerState,
        playRequest,
        equalizer,
        setEqualizer,
        infoPanel,
        setInfoPanel,
        sampleSection,
        setSampleSection,
        startPlaying
    };
}

export type BankEditorModel = ReturnType<typeof useBankEditorModel>;
