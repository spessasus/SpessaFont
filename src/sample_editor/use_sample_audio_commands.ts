import { useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import type { BasicSample } from "spessasynth_core";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { logError } from "../utils/core_utils.ts";
import { pickFile } from "../utils/pick_file.ts";
import { ReplaceSampleAudioAction } from "./replace_sample_audio_action.ts";
import { createReplaceAudioActions, normalizeAudio } from "./sample_audio.ts";

/**
 * Normalizing and replacing the sample's audio, both undoable. Playback stops first, because
 * the playing buffer is the old audio.
 * @param sample the edited sample
 * @param onBeforeChange called before the audio changes
 */
export function useSampleAudioCommands(
    sample: BasicSample,
    onBeforeChange: () => void
) {
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();
    const { apply } = useBankEditor();
    const [isLoading, setIsLoading] = useState(false);

    const replaceAudio = async () => {
        const file = await pickFile("audio/*");
        if (!file) {
            return;
        }
        onBeforeChange();
        setIsLoading(true);
        let decoded: AudioBuffer;
        try {
            decoded = await audioEngine.context.decodeAudioData(
                await file.arrayBuffer()
            );
        } catch (error) {
            logError("Failed to decode the audio file.", error);
            toast.error(t("sampleLocale.tools.invalidAudioFile"));
            return;
        } finally {
            setIsLoading(false);
        }
        const channels = Array.from(
            { length: decoded.numberOfChannels },
            (_, i) => decoded.getChannelData(i)
        );
        const actions = createReplaceAudioActions(
            sample,
            channels,
            decoded.sampleRate
        );
        if (actions) {
            apply(actions);
        } else {
            toast.error(t("sampleLocale.tools.tooManyChannels"));
        }
    };

    const normalize = () => {
        onBeforeChange();
        // The length does not change, so the loop points stay
        const data = normalizeAudio(sample.getAudioData());
        apply([
            new ReplaceSampleAudioAction(sample, {
                data,
                sampleRate: sample.sampleRate,
                loopStart: sample.loopStart,
                loopEnd: sample.loopEnd
            })
        ]);
    };

    return { isLoading, replaceAudio, normalize };
}
