import { useEffect, useState } from "react";
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
    const revision = useSampleView(session.store, sampleId)?.audioRevision;
    const [loaded, setLoaded] = useState<LoadedAudio>();

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
            }
        };
        void read();
        return () => {
            isCurrent = false;
        };
    }, [session, sampleId, revision]);

    return loaded?.id === sampleId ? loaded.data : undefined;
}
