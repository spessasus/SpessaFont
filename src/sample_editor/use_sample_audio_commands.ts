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
import {
    decodeImportedAudio,
    getImportOptions
} from "../menu_list/import_sample.ts";
import { useSettings } from "../settings/settings_context.ts";
import { runAudioTool } from "./run_audio_tool.ts";
import { useSampleTools } from "./use_sample_tools.tsx";

/**
 * Normalizing, equalizing, auto looping, trimming, replacing and exporting the sample's audio,
 * all but the export undoable. All but replacing also change the other half of a stereo pair.
 * Playback stops first, because the playing buffer is the old audio. The tools read the audio
 * first, so they are async and disabled while one runs. Replacing reads a WAV file's loop and
 * applies the Sample Import settings, as importing does.
 * @param sample the edited sample
 * @param onBeforeChange called before the audio changes
 */
export function useSampleAudioCommands(
    sample: BasicSample,
    onBeforeChange: () => void
) {
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();
    const { settings } = useSettings();
    const { session, apply } = useBankEditor();
    const [isLoading, setIsLoading] = useState(false);
    const sampleTools = useSampleTools();

    const run = async (task: () => Promise<void>) => {
        setIsLoading(true);
        // No finally, the React Compiler cannot compile it yet. runAudioTool takes every error
        await runAudioTool(task);
        setIsLoading(false);
    };

    // Like an import: the loop of a WAV file stays and the Sample Import settings apply
    const replaceAudio = async () => {
        const file = await pickFile("audio/*");
        if (!file) {
            return;
        }
        onBeforeChange();
        await run(async () => {
            let decoded;
            try {
                decoded = await decodeImportedAudio(
                    audioEngine.context,
                    await file.arrayBuffer(),
                    getImportOptions(settings)
                );
            } catch (error) {
                logError("Failed to decode the audio file.", error);
                toast.error(t("sampleLocale.tools.invalidAudioFile"));
                return;
            }
            const actions =
                decoded.channelCount > 2
                    ? undefined
                    : await createReplaceAudioActions(
                          session,
                          sample,
                          decoded.channels,
                          decoded.sampleRate,
                          decoded.loop
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
                toast(t("sampleLocale.tools.nothingToNormalize"));
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
            const { loopStart, loopEnd, sampleRate } = sample;
            // In seconds, which core rounds to frames. The loop export is all loop
            const toSeconds = (frame: number) => frame / sampleRate;
            const loop =
                loopEnd <= loopStart
                    ? undefined
                    : {
                          start: toSeconds(isLoopOnly ? 0 : loopStart),
                          end: toSeconds(
                              isLoopOnly ? loopEnd - loopStart : loopEnd
                          )
                      };
            const wav = audioToWav(
                await getExportChannels(session, sample, isLoopOnly),
                sampleRate,
                { normalizeAudio: false, loop }
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
