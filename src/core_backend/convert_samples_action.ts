import type {
    BasicSample,
    BasicSoundBank,
    SampleStoredData,
    SF2VersionTag
} from "spessasynth_core";
import type { HistoryAction } from "./history.ts";
import type { BankDocument } from "./bank_document.ts";
import type { ChangeSet } from "./change_set.ts";

interface SampleState {
    stored: SampleStoredData;
    sampleRate: number;
    loopStart: number;
    loopEnd: number;
}

interface BankFormatState {
    samples: Map<BasicSample, SampleState>;
    version: SF2VersionTag;
}

function captureSample(sample: BasicSample): SampleState {
    return {
        stored: sample.getStoredData(),
        sampleRate: sample.sampleRate,
        loopStart: sample.loopStart,
        loopEnd: sample.loopEnd
    };
}

function applySample(sample: BasicSample, state: SampleState) {
    sample.setStoredData(state.stored);
    sample.sampleRate = state.sampleRate;
    sample.loopStart = state.loopStart;
    sample.loopEnd = state.loopEnd;
}

/**
 * The sample data, rates, loops and file version a format conversion can change.
 * Stored data is captured without copying it.
 */
export function captureBankFormat(bank: BasicSoundBank): BankFormatState {
    return {
        samples: new Map(bank.samples.map((s) => [s, captureSample(s)])),
        version: { ...bank.soundBankInfo.version }
    };
}

interface SampleChange {
    sample: BasicSample;
    before: SampleState;
    after: SampleState;
}

/**
 * An explicit SF2 or SF3 save converts the samples in place (decoding, or compressing and
 * resampling rates outside 8 to 96 kHz). This action records that conversion, so the editor
 * shows the new state and undo can restore the samples before older edits are undone,
 * which would otherwise put old rates and loops on the converted data.
 */
export class ConvertSamplesAction implements HistoryAction {
    /**
     * The action for the changes between two captures, or undefined when nothing changed.
     */
    public static between(
        bank: BasicSoundBank,
        before: BankFormatState
    ): ConvertSamplesAction | undefined {
        const changes = new Array<SampleChange>();
        for (const [sample, old] of before.samples) {
            const current = captureSample(sample);
            if (
                current.stored.data !== old.stored.data ||
                current.sampleRate !== old.sampleRate ||
                current.loopStart !== old.loopStart ||
                current.loopEnd !== old.loopEnd
            ) {
                changes.push({ sample, before: old, after: current });
            }
        }
        const version = { ...bank.soundBankInfo.version };
        const isVersionChanged =
            version.major !== before.version.major ||
            version.minor !== before.version.minor;
        return !isVersionChanged && changes.length === 0
            ? undefined
            : new ConvertSamplesAction(changes, before.version, version);
    }

    private readonly changes: readonly SampleChange[];
    private readonly versionBefore: SF2VersionTag;
    private readonly versionAfter: SF2VersionTag;

    private constructor(
        changes: readonly SampleChange[],
        versionBefore: SF2VersionTag,
        versionAfter: SF2VersionTag
    ) {
        this.changes = changes;
        this.versionBefore = versionBefore;
        this.versionAfter = versionAfter;
    }

    public do(document: BankDocument, changes: ChangeSet) {
        for (const { sample, after } of this.changes) {
            applySample(sample, after);
            changes.touch(sample);
        }
        document.bank.soundBankInfo.version = { ...this.versionAfter };
        changes.touchBankInfo();
    }

    public undo(document: BankDocument, changes: ChangeSet) {
        for (const { sample, before } of this.changes) {
            applySample(sample, before);
            changes.touch(sample);
        }
        document.bank.soundBankInfo.version = { ...this.versionBefore };
        changes.touchBankInfo();
    }
}
