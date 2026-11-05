import { useCallback, useEffect, useReducer, useRef } from "react";
import { useTranslation } from "react-i18next";
import { BasicInstrument, BasicPreset } from "spessasynth_core";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import { useEventListener } from "../hooks/use_event_listener.ts";
import { showToastDialog } from "../toasts/show_toast_dialog.tsx";
import { useSaveBank } from "../hooks/use_save_bank.ts";
import { createTabsState, tabsReducer } from "./tabs_reducer.ts";

/**
 * The open banks, the active one, and the selected element of each.
 * Plays the active bank on the shared synthesizer and warns before leaving with unsaved changes.
 */
export function useBankTabs() {
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();
    const saveBank = useSaveBank();
    const [state, dispatch] = useReducer(
        tabsReducer<BankSession>,
        undefined,
        createTabsState<BankSession>
    );
    const { tabs, activeId, views } = state;
    const activeSession = tabs.find((tab) => tab.id === activeId);
    const activeView = activeSession
        ? (views.get(activeSession.id) ?? "info")
        : "info";

    useEffect(() => {
        if (activeSession) activeSession.attach();
        else audioEngine.pauseMIDI();
    }, [audioEngine, activeSession]);

    useEventListener(globalThis, "beforeunload", (e) => {
        if (tabs.some((tab) => tab.history.isDirty)) {
            e.preventDefault();
        }
    });

    // Tabs with an open "unsaved changes" question
    const closePrompts = useRef(new Set<number>());

    const openSession = (session: BankSession) => {
        dispatch({ type: "open", tab: session });
    };

    const closeSession = (session: BankSession) => {
        session.close();
        dispatch({ type: "close", id: session.id });
    };

    /**
     * Closes the tab, asking first when it has unsaved changes.
     */
    const requestClose = (session: BankSession) => {
        if (!session.history.isDirty) {
            closeSession(session);
            return;
        }
        // One question per tab, a second click on close would stack another
        if (closePrompts.current.has(session.id)) {
            return;
        }
        closePrompts.current.add(session.id);
        const forgetPrompt = () => {
            closePrompts.current.delete(session.id);
        };
        showToastDialog({
            content: t("unsavedChanges"),
            isError: true,
            buttons: [
                {
                    label: t("saveAndClose"),
                    onClick: () => {
                        forgetPrompt();
                        void saveBank(session, "auto").then((result) => {
                            // An edit made while it was writing is not in the file
                            if (
                                result === "saved" &&
                                !session.history.isDirty
                            ) {
                                closeSession(session);
                            }
                        });
                    }
                },
                {
                    label: t("discard"),
                    onClick: () => {
                        forgetPrompt();
                        closeSession(session);
                    }
                },
                { label: t("keep"), onClick: forgetPrompt }
            ]
        });
    };

    const activate = (id: number) => {
        dispatch({ type: "activate", id });
    };

    // Stable per active tab, because the bank editor context depends on it
    const setActiveView = useCallback(
        (view: BankEditView) => {
            if (activeId !== undefined) {
                dispatch({ type: "setView", id: activeId, view });
            }
        },
        [activeId]
    );

    /**
     * Shows the element shown before (or after) the current one, skipping removed ones.
     */
    const navigate = (type: "goBack" | "goForward") => {
        if (!activeSession) return;
        const { document } = activeSession;
        dispatch({
            type,
            id: activeSession.id,
            isAvailable: (view) => {
                if (view === "info") return true;
                if (view instanceof BasicPreset) {
                    return document.presets.includes(view);
                }
                return view instanceof BasicInstrument
                    ? document.instruments.includes(view)
                    : document.samples.includes(view);
            }
        });
    };

    return {
        goBack: () => navigate("goBack"),
        goForward: () => navigate("goForward"),
        tabs,
        activeSession,
        activeView,
        openSession,
        requestClose,
        activate,
        setActiveView
    };
}
