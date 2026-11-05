import type { SF2VersionTag } from "spessasynth_core";
import type { HistoryAction } from "./history.ts";
import type { BankDocument } from "./bank_document.ts";
import type { ChangeSet } from "./change_set.ts";
import type { ConversionReport, SampleState } from "../synth_host/protocol.ts";

/**
 * An explicit SF2 or SF3 save converts the mirror's samples in place (decoding, or compressing
 * and resampling rates outside 8 to 96 kHz). This action records that conversion on the
 * editor's samples, so the editor shows the new state and undo can restore the samples before
 * older edits are undone, which would otherwise put old rates and loops on the converted data.
 * The data itself stays in the host, as the snapshots from before and after.
 */
export class ConvertSamplesAction implements HistoryAction {
    private readonly report: ConversionReport;

    public readonly label = "convertSamples";

    public constructor(report: ConversionReport) {
        this.report = report;
    }

    private apply(
        document: BankDocument,
        changes: ChangeSet,
        side: "before" | "after",
        snapshot: number,
        version: SF2VersionTag
    ) {
        for (const entry of this.report.samples) {
            const sample = document.getSample(entry.id);
            if (!sample) {
                throw new Error(`The converted sample ${entry.id} is gone.`);
            }
            const state: SampleState = entry[side];
            sample.sampleRate = state.sampleRate;
            sample.loopStart = state.loopStart;
            sample.loopEnd = state.loopEnd;
            changes.touchSampleAudio(sample, {
                snapshot,
                form: state.form,
                length: state.length
            });
        }
        document.bank.soundBankInfo.version = { ...version };
        changes.touchBankInfo();
    }

    public do(document: BankDocument, changes: ChangeSet) {
        this.apply(
            document,
            changes,
            "after",
            this.report.afterSnapshot,
            this.report.versionAfter
        );
    }

    public undo(document: BankDocument, changes: ChangeSet) {
        this.apply(
            document,
            changes,
            "before",
            this.report.beforeSnapshot,
            this.report.versionBefore
        );
    }
}
