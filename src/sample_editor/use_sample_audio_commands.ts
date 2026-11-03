import { useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import type { BasicSample } from "spessasynth_core";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { logError } from "../utils/core_utils.ts";
import { pickFile } from "../utils/pick_file.ts";
import {
    createAutoLoopActions,
    createEqualizerActions,
    createNormalizeActions,
    createReplaceAudioActions
} from "./sample_audio.ts";
import type { EqualizerSettings } from "./equalizer/equalizer.ts";

/**
 * Normalizing, equalizing, auto looping and replacing the sample's audio, all undoable. All but
 * replacing also change the other half of a stereo pair. Playback stops first, because the
 * playing buffer is the old audio.
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
        const actions = createNormalizeActions([sample]);
        if (actions.length === 0) {
            return;
        }
        onBeforeChange();
        apply(actions);
    };

    const equalize = (settings: EqualizerSettings) => {
        onBeforeChange();
        const { actions, isClipping } = createEqualizerActions(
            [sample],
            settings
        );
        apply(actions);
        if (isClipping) {
            toast.error(t("sampleLocale.equalizer.clipping"));
        }
    };

    const autoLoop = () => {
        const { actions } = createAutoLoopActions([sample]);
        if (actions.length === 0) {
            toast.error(t("sampleLocale.tools.tooShortToLoop"));
            return;
        }
        onBeforeChange();
        apply(actions);
    };

    return { isLoading, replaceAudio, normalize, equalize, autoLoop };
}
