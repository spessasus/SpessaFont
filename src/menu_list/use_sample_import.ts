import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import type { HistoryActionGroup } from "../core_backend/history.ts";
import { showToastDialog } from "../toasts/show_toast_dialog.tsx";
import {
    createSamplesImportActions,
    getImportOptions
} from "./import_sample.ts";
import { useSettings } from "../settings/settings_context.ts";
import { createInstrumentFromSamples } from "./link_actions.ts";

/**
 * Imports audio files as samples in one undo step. After several files it offers to make an
 * instrument from them, which is what a folder of multisamples is usually for.
 * @returns a function that imports the files through `apply`, and resolves to the count of
 * added samples
 */
export function useSampleImport() {
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();
    const { settings } = useSettings();
    return async (
        files: readonly File[],
        apply: (actions: HistoryActionGroup) => void
    ) => {
        const { actions, samples, failed } = await createSamplesImportActions(
            audioEngine.context,
            files,
            getImportOptions(settings)
        );
        for (const name of failed) {
            toast.error(t("loadingAndSaving.unsupportedFile", { name }));
        }
        if (actions.length === 0) {
            return 0;
        }
        apply(actions);
        const imported = files.length - failed.length;
        if (imported > 1) {
            showToastDialog({
                content: t("sampleLocale.importedSamples", { count: imported }),
                buttons: [
                    {
                        label: t("sampleLocale.makeInstrument"),
                        onClick: () =>
                            apply([createInstrumentFromSamples(samples)])
                    },
                    { label: t("sampleLocale.notNow") }
                ]
            });
        }
        return samples.length;
    };
}
