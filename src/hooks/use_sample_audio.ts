import { useEffect, useEffectEvent, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { BankSession } from "../core_backend/bank_session.ts";
import { logError } from "../utils/core_utils.ts";
import { useSampleView } from "./use_sample_view.ts";

interface LoadedAudio {
    id: number;
    revision: number;
    data: Float32Array;
}

/**
 * The decoded audio of a sample, read from the mirror and read again when the sample's audio
 * changes. Until the first read finishes it is undefined. While a changed sample is read again,
 * the old audio stays, so the wave view does not flash empty.
 */
export function useSampleAudio(session: BankSession, sampleId: number) {
    const { t } = useTranslation();
    const revision = useSampleView(session.store, sampleId)?.audioRevision;
    const [loaded, setLoaded] = useState<LoadedAudio>();
    // Otherwise the wave view stays empty with no reason given
    const showError = useEffectEvent((error: unknown) => {
        toast.error(
            t("sampleLocale.audioReadFailed", { message: String(error) })
        );
    });

    useEffect(() => {
        const sample = session.document.getSample(sampleId);
        if (revision === undefined || !sample) {
            return;
        }
        let isCurrent = true;
        const read = async () => {
            try {
                const data = await session.readAudio(sample);
                if (isCurrent) {
                    setLoaded({ id: sampleId, revision, data });
                }
            } catch (error) {
                logError("Failed to read the sample audio.", error);
                if (isCurrent) {
                    showError(error);
                }
            }
        };
        void read();
        return () => {
            isCurrent = false;
        };
    }, [session, sampleId, revision]);

    return loaded?.id === sampleId ? loaded.data : undefined;
}
