import { useEffect } from "react";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";

/**
 * Makes the keyboard play the shown element: the preset, instrument or sample being edited,
 * or the bank's first preset on the overview.
 */
export function usePreviewTarget(session: BankSession, view: BankEditView) {
    const { audioEngine } = useAudioEngine();
    useEffect(() => {
        const bank = session.document.bank;
        audioEngine.setPreviewTarget(view === "info" ? undefined : view, bank);
        return () => audioEngine.setPreviewTarget(undefined, bank);
    }, [audioEngine, session, view]);
}
