import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import type { HistoryActionGroup } from "../core_backend/history.ts";
import type { BankDocument } from "../core_backend/bank_document.ts";
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
 * @returns a function that imports the files into the document through `apply`, and resolves
 * to the count of added samples
 */
export function useSampleImport() {
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();
    const { settings } = useSettings();
    return async (
        files: readonly File[],
        document: BankDocument,
        apply: (actions: HistoryActionGroup) => void
    ) => {
        const id = toast.loading(
            t("sampleLocale.importingSamples", {
                done: 0,
                total: files.length
            })
        );
        let result: Awaited<ReturnType<typeof createSamplesImportActions>>;
        try {
            result = await createSamplesImportActions(
                audioEngine.context,
                files,
                {
                    options: getImportOptions(settings),
                    takenNames: document.samples.map((s) => s.name),
                    onProgress: (done, total) =>
                        toast.loading(
                            t("sampleLocale.importingSamples", { done, total }),
                            { id }
                        )
                }
            );
        } catch (error) {
            toast.dismiss(id);
            throw error;
        }
        toast.dismiss(id);
        const { actions, samples, failed } = result;
        if (failed.length === 1) {
            toast.error(
                t("loadingAndSaving.unsupportedFile", { name: failed[0] })
            );
        } else if (failed.length > 1) {
            toast.error(
                t("sampleLocale.importFailed", {
                    count: failed.length,
                    names: failed.join(", ")
                })
            );
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
                        // The toast stays, the import may have been undone or its tab closed
                        onClick: () => {
                            const left = samples.filter((s) =>
                                document.contains(s)
                            );
                            if (left.length === 0) {
                                toast.error(
                                    t("sampleLocale.importedSamplesGone")
                                );
                                return;
                            }
                            apply([
                                createInstrumentFromSamples(document, left)
                            ]);
                        }
                    },
                    { label: t("sampleLocale.notNow") }
                ]
            });
        }
        return samples.length;
    };
}
