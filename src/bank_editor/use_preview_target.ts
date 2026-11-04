import { useEffect } from "react";
import { BasicInstrument, BasicPreset } from "spessasynth_core";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import type { MirrorTarget } from "../synth_host/bank_mirror.ts";
import { getObjectId } from "../utils/object_id.ts";

function getTarget(view: BankEditView): MirrorTarget | undefined {
    if (view === "info") {
        return undefined;
    }
    const id = getObjectId(view);
    if (view instanceof BasicPreset) {
        return { kind: "preset", id };
    }
    return view instanceof BasicInstrument
        ? { kind: "instrument", id }
        : { kind: "sample", id };
}

/**
 * Makes the keyboard play the shown element: the preset, instrument or sample being edited,
 * or the bank's first preset on the overview.
 */
export function usePreviewTarget(session: BankSession, view: BankEditView) {
    useEffect(() => {
        session.setPreviewTarget(getTarget(view));
        return () => session.setPreviewTarget(undefined);
    }, [session, view]);
}
