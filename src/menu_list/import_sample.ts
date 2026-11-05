import { type BasicSample, EmptySample, SampleTypes } from "spessasynth_core";
import { CreateSampleAction } from "./create_actions/create_sample_action.ts";
import { getRootKeyFromName } from "../utils/root_key_from_name.ts";
import { logError } from "../utils/core_utils.ts";

/**
 * What the import needs of an audio context, so tests can decode without Web Audio.
 */
interface AudioDecoder {
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
 * Sample names leave room for the "L" or "R" of a stereo pair.
 */
const MAX_BASE_NAME_LENGTH = 39;

/**
 * Decodes an audio file into a sample, or a stereo pair for a stereo file, named after the
 * file. A note in the name ("Piano C4") becomes the root key.
 * Throws when the file cannot be decoded.
 */
async function decodeSampleFile(context: AudioDecoder, file: File) {
    const audioBuffer = await context.decodeAudioData(await file.arrayBuffer());
    const dotIndex = file.name.lastIndexOf(".");
    const baseName = (
        dotIndex === -1 ? file.name : file.name.slice(0, dotIndex)
    ).slice(0, MAX_BASE_NAME_LENGTH);
    const isStereo = audioBuffer.numberOfChannels > 1;
    const rootKey = getRootKeyFromName(baseName);

    const sample = new EmptySample();
    sample.name = baseName + (isStereo ? "L" : "");
    sample.setAudioData(audioBuffer.getChannelData(0), audioBuffer.sampleRate);
    // Loop the whole sample, like replaced audio, instead of an empty loop
    sample.loopEnd = audioBuffer.length;
    if (rootKey !== undefined) sample.originalKey = rootKey;
    const samples = [sample];
    if (isStereo) {
        const right = new EmptySample();
        right.name = baseName + "R";
        right.setAudioData(
            audioBuffer.getChannelData(1),
            audioBuffer.sampleRate
        );
        right.loopEnd = audioBuffer.length;
        if (rootKey !== undefined) right.originalKey = rootKey;
        right.setLinkedSample(sample, SampleTypes.rightSample);
        samples.push(right);
    }
    return samples;
}

/**
 * Decodes several audio files into the actions that add them, for one undo step.
 * `samples` are the new samples and `failed` the names of the files that could not be decoded.
 */
export async function createSamplesImportActions(
    context: AudioDecoder,
    files: readonly File[]
) {
    const samples = new Array<BasicSample>();
    const failed = new Array<string>();
    for (const file of files) {
        try {
            samples.push(...(await decodeSampleFile(context, file)));
        } catch (error) {
            logError(`Failed to import ${file.name}.`, error);
            failed.push(file.name);
        }
    }
    return {
        actions: samples.map((s) => new CreateSampleAction(s)),
        samples,
        failed
    };
}
