import type { BasicSample, SampleStoredData } from "spessasynth_core";

/**
 * Where the editor reads sample audio from. The mirror holds it, and once it runs on the
 * synthesizer's thread the reads are messages, so they are async already.
 */
export interface SampleDataSource {
    /**
     * The decoded audio.
     */
    readAudio(sample: BasicSample): Promise<Float32Array>;

    /**
     * The data as the sample stores it, which an undo can restore without re-encoding.
     */
    readStoredData(sample: BasicSample): Promise<SampleStoredData>;
}
