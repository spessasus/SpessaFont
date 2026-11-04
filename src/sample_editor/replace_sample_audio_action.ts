import type { BasicSample, SampleStoredData } from "spessasynth_core";
import type { HistoryAction } from "../core_backend/history.ts";
import type { BankDocument } from "../core_backend/bank_document.ts";
import type { ChangeSet } from "../core_backend/change_set.ts";
import type { SampleDataSource } from "../core_backend/sample_data_source.ts";

interface SampleAudio {
    /**
     * As the sample stores it, so undo restores a compressed stream without re-encoding.
     */
    stored: SampleStoredData;
    sampleRate: number;
    loopStart: number;
    loopEnd: number;
}

export interface NewSampleAudio {
    data: Float32Array;
    sampleRate: number;
    /**
     * The new loop points, by default the whole new audio.
     */
    loopStart?: number;
    loopEnd?: number;
}

/**
 * Replaces the audio of a sample (a new file, or normalized audio) and its loop points.
 * The editor's sample holds the data only until the mirror took it.
 */
export class ReplaceSampleAudioAction implements HistoryAction {
    /**
     * Reads the current audio for the undo first.
     */
    public static async create(
        source: SampleDataSource,
        sample: BasicSample,
        audio: NewSampleAudio
    ) {
        const before = await source.readStoredData(sample);
        return new ReplaceSampleAudioAction(sample, before, audio);
    }

    private readonly sample: BasicSample;
    private readonly before: SampleAudio;
    private readonly after: SampleAudio;

    public constructor(
        sample: BasicSample,
        before: SampleStoredData,
        audio: NewSampleAudio
    ) {
        this.sample = sample;
        this.before = {
            stored: before,
            sampleRate: sample.sampleRate,
            loopStart: sample.loopStart,
            loopEnd: sample.loopEnd
        };
        this.after = {
            stored: { form: "float32", data: audio.data },
            sampleRate: audio.sampleRate,
            loopStart: audio.loopStart ?? 0,
            loopEnd: audio.loopEnd ?? audio.data.length
        };
    }

    private apply(changes: ChangeSet, audio: SampleAudio) {
        this.sample.setStoredData(audio.stored);
        this.sample.sampleRate = audio.sampleRate;
        this.sample.loopStart = audio.loopStart;
        this.sample.loopEnd = audio.loopEnd;
        changes.touchSampleAudio(this.sample);
    }

    public do(_document: BankDocument, changes: ChangeSet) {
        this.apply(changes, this.after);
    }

    public undo(_document: BankDocument, changes: ChangeSet) {
        this.apply(changes, this.before);
    }
}
