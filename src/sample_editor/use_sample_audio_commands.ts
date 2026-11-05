import { useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { audioToWav, type BasicSample } from "spessasynth_core";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { logError } from "../utils/core_utils.ts";
import { pickFile } from "../utils/pick_file.ts";
import { downloadBlob } from "../utils/download_blob.ts";
import {
    createAutoLoopActions,
    createEqualizerActions,
    createNormalizeActions,
    createReplaceAudioActions,
    getExportChannels
} from "./sample_audio.ts";
import type { EqualizerSettings } from "./equalizer/equalizer.ts";
import { decodeAudioFile } from "../utils/decode_audio_file.ts";
import { useSampleTools } from "./use_sample_tools.tsx";

/**
 * Normalizing, equalizing, auto looping, trimming, replacing and exporting the sample's audio,
 * all but the export undoable. All but replacing also change the other half of a stereo pair.
 * Playback stops first, because the playing buffer is the old audio. The tools read the audio
 * first, so they are async and disabled while one runs.
 * @param sample the edited sample
 * @param onBeforeChange called before the audio changes
 */
export function useSampleAudioCommands(
    sample: BasicSample,
    onBeforeChange: () => void
) {
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();
    const { session, apply } = useBankEditor();
    const [isLoading, setIsLoading] = useState(false);
    const sampleTools = useSampleTools();

    const run = async (task: () => Promise<void>) => {
        setIsLoading(true);
        try {
            await task();
        } catch (error) {
            logError("Failed to process the sample audio.", error);
            toast.error(String(error));
        } finally {
            setIsLoading(false);
        }
    };

    const replaceAudio = async () => {
        const file = await pickFile("audio/*");
        if (!file) {
            return;
        }
        onBeforeChange();
        await run(async () => {
            let decoded;
            try {
                decoded = await decodeAudioFile(
                    audioEngine.context,
                    await file.arrayBuffer()
                );
            } catch (error) {
                logError("Failed to decode the audio file.", error);
                toast.error(t("sampleLocale.tools.invalidAudioFile"));
                return;
            }
            const channels = Array.from(
                { length: decoded.numberOfChannels },
                (_, i) => decoded.getChannelData(i)
            );
            const actions = await createReplaceAudioActions(
                session,
                sample,
                channels,
                decoded.sampleRate
            );
            if (actions) {
                apply(actions);
            } else {
                toast.error(t("sampleLocale.tools.tooManyChannels"));
            }
        });
    };

    const normalize = () =>
        run(async () => {
            const actions = await createNormalizeActions(session, [sample]);
            if (actions.length === 0) {
                return;
            }
            onBeforeChange();
            apply(actions);
        });

    const equalize = (settings: EqualizerSettings) =>
        run(async () => {
            const { actions, isClipping } = await createEqualizerActions(
                session,
                [sample],
                settings
            );
            onBeforeChange();
            apply(actions);
            if (isClipping) {
                toast.error(t("sampleLocale.equalizer.clipping"));
            }
        });

    const autoLoop = () =>
        run(async () => {
            const { actions } = await createAutoLoopActions(session, [sample]);
            if (actions.length === 0) {
                toast.error(t("sampleLocale.tools.tooShortToLoop"));
                return;
            }
            onBeforeChange();
            apply(actions);
        });

    const removeSilence = () =>
        run(() => sampleTools.removeSilence([sample], onBeforeChange));

    const trimAfterLoop = () =>
        run(() => sampleTools.trimAfterLoop([sample], onBeforeChange));

    // The original audio and rate, not the playback buffer, which may be resampled
    const exportWav = (isLoopOnly: boolean) =>
        run(async () => {
            const wav = audioToWav(
                await getExportChannels(session, sample, isLoopOnly),
                sample.sampleRate,
                { normalizeAudio: false }
            );
            const name = isLoopOnly ? `${sample.name}_loop` : sample.name;
            downloadBlob(new Blob([wav], { type: "audio/wav" }), `${name}.wav`);
        });

    return {
        isLoading,
        replaceAudio,
        normalize,
        equalize,
        autoLoop,
        removeSilence,
        trimAfterLoop,
        exportWav
    };
}
