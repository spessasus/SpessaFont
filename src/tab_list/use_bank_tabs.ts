import { useEffect, useReducer } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { BasicInstrument, BasicPreset } from "spessasynth_core";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import { useEventListener } from "../hooks/use_event_listener.ts";
import { showToastDialog } from "../toasts/show_toast_dialog.tsx";
import { useSaveBank } from "../hooks/use_save_bank.ts";
import { createTabsState, tabsReducer } from "./tabs_reducer.ts";
import { catchLostFocus } from "../utils/focus_return.ts";

/**
 * The selected tab's button, or the welcome screen's first button when no tab is left.
 */
function findActiveTab() {
    return document.querySelector<HTMLElement>(
        ".tab_select[aria-current=true], [data-focus-fallback]"
    );
}

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

    const openSession = (session: BankSession) => {
        dispatch({ type: "open", tab: session });
        // Opened from the welcome screen, whose button went away with it
        catchLostFocus(findActiveTab);
    };

    // One question per tab, a second click on close shows the same one again
    const getPromptId = (session: BankSession) => `close-${session.id}`;

    const closeSession = (session: BankSession) => {
        // A question left open would save or close a tab that is gone
        toast.dismiss(getPromptId(session));
        session.close();
        dispatch({ type: "close", id: session.id });
        // The close button (or the question's button) went away with the tab
        catchLostFocus(findActiveTab);
    };

    /**
     * Closes the tab, asking first when it has unsaved changes.
     */
    const requestClose = (session: BankSession) => {
        if (!session.history.isDirty) {
            closeSession(session);
            return;
        }
        const { name } = session.store.getSnapshot().info;
        showToastDialog({
            id: getPromptId(session),
            content: t("bankHasUnsavedChanges", {
                name: name.length > 0 ? name : t("bankInfo.unnamed")
            }),
            buttons: [
                {
                    label: t("saveAndClose"),
                    onClick: () => {
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
                    onClick: () => closeSession(session)
                },
                { label: t("keep") }
            ]
        });
    };

    const activate = (id: number) => {
        dispatch({ type: "activate", id });
    };

    const setActiveView = (view: BankEditView) => {
        if (activeId !== undefined) {
            dispatch({ type: "setView", id: activeId, view });
        }
    };

    /**
     * Shows the element in the tab of the session, which need not be the active one in this
     * render (a tab opened by the same handler).
     */
    const setSessionView = (id: number, view: BankEditView) => {
        dispatch({ type: "setView", id, view });
    };

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
        setActiveView,
        setSessionView
    };
}
