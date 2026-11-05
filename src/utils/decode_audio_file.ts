import { readWavSampleRate } from "../menu_list/wav_loop.ts";
import { logWarn } from "./core_utils.ts";

/**
 * The sample rate a FLAC file stores its audio at, from its STREAMINFO block (20 bits at byte 18).
 */
function readFLACSampleRate(file: ArrayBuffer) {
    const bytes = new Uint8Array(file);
    const isFLAC =
        bytes.length > 21 &&
        String.fromCodePoint(...bytes.subarray(0, 4)) === "fLaC";
    return isFLAC
        ? (bytes[18] << 12) | (bytes[19] << 4) | (bytes[20] >> 4)
        : undefined;
}

/**
 * Something that decodes audio files, a live context in the app or a stand-in in tests.
 */
export interface AudioDecoder {
    decodeAudioData: (
        data: ArrayBuffer
    ) => Promise<
        Pick<
            AudioBuffer,
            "numberOfChannels" | "sampleRate" | "length" | "getChannelData"
        >
    >;
}

/**
 * Decodes an audio file at the rate it was recorded at where that rate can be read (WAV and
 * FLAC), so a 22 kHz file is not stored at the engine's 48 kHz, twice the size. Other files, and
 * rates an offline context does not take, decode at the fallback context's rate.
 */
export async function decodeAudioFile(
    fallback: AudioDecoder,
    data: ArrayBuffer
) {
    const rate = readWavSampleRate(data) ?? readFLACSampleRate(data);
    if (rate !== undefined && typeof OfflineAudioContext !== "undefined") {
        try {
            // Decoding takes the buffer, a copy keeps it for the fallback
            return await new OfflineAudioContext(1, 1, rate).decodeAudioData(
                data.slice(0)
            );
        } catch (error) {
            logWarn(
                `Could not decode at ${rate} Hz, using the engine's rate.`,
                error
            );
        }
    }
    return fallback.decodeAudioData(data);
}
