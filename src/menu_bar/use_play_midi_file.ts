import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import { ACCEPTED_MIDI_FORMATS } from "../utils/accepted_formats.ts";
import { pickFile } from "../utils/pick_file.ts";
import { logError } from "../utils/core_utils.ts";

/**
 * Returns the command that asks for a MIDI file and plays it, used by the MIDI player menu and
 * the phone's overflow.
 */
export function usePlayMIDIFile() {
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();

    return async () => {
        const file = await pickFile(ACCEPTED_MIDI_FORMATS);
        if (!file) {
            return;
        }
        try {
            await audioEngine.playMIDI(await file.arrayBuffer(), file.name);
        } catch (error) {
            logError(`Failed to load ${file.name}.`, error);
            toast.error(t("menuBarLocale.midi.loadError", { name: file.name }));
        }
    };
}
