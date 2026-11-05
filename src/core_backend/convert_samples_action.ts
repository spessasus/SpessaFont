import type { BasicSample, SF2VersionTag } from "spessasynth_core";
import type { HistoryAction } from "./history.ts";
import type { BankDocument } from "./bank_document.ts";
import type { ChangeSet } from "./change_set.ts";
import type { SampleState } from "../synth_host/protocol.ts";
import { setSampleFormWithoutData } from "./sample_form.ts";

export interface SampleConversion {
    readonly sample: BasicSample;
    readonly before: SampleState;
    readonly after: SampleState;
}

/**
 * The part of the host's conversion report the editor records.
 */
export interface RecordedConversion {
    readonly samples: readonly SampleConversion[];
    readonly beforeSnapshot: number;
    readonly afterSnapshot: number;
    readonly versionBefore: SF2VersionTag;
    readonly versionAfter: SF2VersionTag;
}

/**
 * An explicit SF2 or SF3 save converts the samples in the host (decoding, or compressing and
 * resampling rates outside 8 to 96 kHz). This action records that conversion on the editor's
 * samples, so the editor shows the new state and undo can restore the samples before older
 * edits are undone, which would otherwise put old rates and loops on the converted data.
 * The data itself stays in the host, as the snapshots from before and after. The samples are
 * kept as objects, so a sample removed later is still converted back by an undo.
 */
export class ConvertSamplesAction implements HistoryAction {
    private readonly conversion: RecordedConversion;

    public readonly label = "convertSamples";

    public constructor(conversion: RecordedConversion) {
        this.conversion = conversion;
    }

    private apply(
        document: BankDocument,
        changes: ChangeSet,
        side: "before" | "after",
        snapshot: number,
        version: SF2VersionTag
    ) {
        for (const conversion of this.conversion.samples) {
            const { sample } = conversion;
            const state = conversion[side];
            sample.sampleRate = state.sampleRate;
            sample.loopStart = state.loopStart;
            sample.loopEnd = state.loopEnd;
            setSampleFormWithoutData(sample, state.form, state.length);
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
            this.conversion.afterSnapshot,
            this.conversion.versionAfter
        );
    }

    public undo(document: BankDocument, changes: ChangeSet) {
        this.apply(
            document,
            changes,
            "before",
            this.conversion.beforeSnapshot,
            this.conversion.versionBefore
        );
    }
}
