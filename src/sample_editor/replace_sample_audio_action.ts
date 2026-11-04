import type { BasicSample } from "spessasynth_core";
import type { HistoryAction } from "../core_backend/history.ts";
import type { BankDocument } from "../core_backend/bank_document.ts";
import type { ChangeSet } from "../core_backend/change_set.ts";

interface SampleAudio {
    /**
     * The compressed stream of a compressed sample, kept so undo restores it without re-encoding.
     */
    compressed: Uint8Array | undefined;
    data: Float32Array | undefined;
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

function captureAudio(sample: BasicSample): SampleAudio {
    const isCompressed = sample.isCompressed;
    return {
        compressed: isCompressed ? sample.getRawData(true) : undefined,
        data: isCompressed ? undefined : sample.getAudioData(),
        sampleRate: sample.sampleRate,
        loopStart: sample.loopStart,
        loopEnd: sample.loopEnd
    };
}

/**
 * Replaces the audio of a sample (a new file, or normalized audio) and its loop points.
 */
export class ReplaceSampleAudioAction implements HistoryAction {
    private readonly sample: BasicSample;
    private readonly before: SampleAudio;
    private readonly after: SampleAudio;

    public constructor(sample: BasicSample, audio: NewSampleAudio) {
        this.sample = sample;
        this.before = captureAudio(sample);
        this.after = {
            compressed: undefined,
            data: audio.data,
            sampleRate: audio.sampleRate,
            loopStart: audio.loopStart ?? 0,
            loopEnd: audio.loopEnd ?? audio.data.length
        };
    }

    private apply(changes: ChangeSet, audio: SampleAudio) {
        if (audio.compressed) {
            this.sample.setCompressedData(audio.compressed);
            this.sample.sampleRate = audio.sampleRate;
        } else if (audio.data) {
            this.sample.setAudioData(audio.data, audio.sampleRate);
        }
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
