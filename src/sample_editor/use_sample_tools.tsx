import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import type { BasicSample } from "spessasynth_core";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useDialogs } from "../dialogs/dialogs_context.ts";
import { runAudioTool } from "./run_audio_tool.ts";
import { mergeDuplicateSamples } from "./merge_duplicates_command.ts";
import {
    createShiftActions,
    type SampleShift
} from "./shift_sample_actions.ts";
import { ShiftSamplesDialog } from "./shift_samples_dialog.tsx";
import {
    createRemoveSilenceActions,
    createTrimAfterLoopActions
} from "./trim_actions.ts";

/**
 * The sample tools of the list menu and the sample editor: shifting a property, removing
 * silence at the start, trimming after the loop, and merging duplicates. Each runs as one undo
 * step, and says when it changed nothing.
 */
export function useSampleTools() {
    const { t } = useTranslation();
    const { session, apply } = useBankEditor();
    const { openDialog } = useDialogs();
    const getLength = (sample: BasicSample) => session.getSampleLength(sample);

    const shift = async (samples: Iterable<BasicSample>) => {
        const answer = await openDialog<SampleShift>((onAnswer) => (
            <ShiftSamplesDialog onAnswer={onAnswer} />
        ));
        const isNoChange =
            !answer ||
            (answer.operation === "add"
                ? answer.value === 0
                : answer.value === 1);
        if (!answer || isNoChange) {
            return;
        }
        const { actions, clamped } = createShiftActions(
            samples,
            answer,
            getLength
        );
        if (actions.length === 0) {
            toast(t("toolsLocale.nothingChanged"));
            return;
        }
        apply(actions);
        toast.success(
            t("toolsLocale.shift.done", { count: actions.length, clamped })
        );
    };

    /**
     * @param samples the samples
     * @param onBeforeChange called before the audio changes, the sample editor stops playback
     */
    const removeSilence = (
        samples: Iterable<BasicSample>,
        onBeforeChange?: () => void
    ) =>
        runAudioTool(async () => {
            const { actions, silent } = await createRemoveSilenceActions(
                session,
                samples
            );
            if (actions.length > 0) {
                onBeforeChange?.();
                apply(actions);
            } else if (silent === 0) {
                toast(t("toolsLocale.trim.noSilence"));
            }
            if (silent > 0) {
                toast.error(
                    t("toolsLocale.trim.skippedSilent", { count: silent })
                );
            }
        });

    const trimAfterLoop = (
        samples: Iterable<BasicSample>,
        onBeforeChange?: () => void
    ) =>
        runAudioTool(async () => {
            const { actions, skipped, losesTail } =
                await createTrimAfterLoopActions(session, samples);
            if (actions.length > 0) {
                onBeforeChange?.();
                apply(actions);
            }
            if (skipped > 0) {
                toast.error(
                    t("toolsLocale.trim.skippedNoLoop", { count: skipped })
                );
            }
            if (losesTail > 0) {
                toast(t("toolsLocale.trim.losesTail", { count: losesTail }));
            }
        });

    const mergeDuplicates = (samples: ReadonlySet<BasicSample>) =>
        mergeDuplicateSamples(session, samples, t, apply);

    return { shift, removeSilence, trimAfterLoop, mergeDuplicates };
}
