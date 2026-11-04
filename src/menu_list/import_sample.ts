import { EmptySample, SampleTypes } from "spessasynth_core";
import { CreateSampleAction } from "./create_actions/create_sample_action.ts";

/**
 * Sample names leave room for the "L" or "R" of a stereo pair.
 */
const MAX_BASE_NAME_LENGTH = 39;

/**
 * Decodes an audio file into actions that add it as a sample, or a stereo pair for a stereo
 * file, named after the file. Throws when the file cannot be decoded.
 */
export async function createSampleImportActions(
    context: BaseAudioContext,
    file: File
) {
    const audioBuffer = await context.decodeAudioData(await file.arrayBuffer());
    const dotIndex = file.name.lastIndexOf(".");
    const baseName = (
        dotIndex === -1 ? file.name : file.name.slice(0, dotIndex)
    ).slice(0, MAX_BASE_NAME_LENGTH);
    const isStereo = audioBuffer.numberOfChannels > 1;

    const sample = new EmptySample();
    sample.name = baseName + (isStereo ? "L" : "");
    sample.setAudioData(audioBuffer.getChannelData(0), audioBuffer.sampleRate);
    // Loop the whole sample, like replaced audio, instead of an empty loop
    sample.loopEnd = audioBuffer.length;
    const actions = [new CreateSampleAction(sample)];
    if (isStereo) {
        const right = new EmptySample();
        right.name = baseName + "R";
        right.setAudioData(
            audioBuffer.getChannelData(1),
            audioBuffer.sampleRate
        );
        right.loopEnd = audioBuffer.length;
        right.setLinkedSample(sample, SampleTypes.rightSample);
        actions.push(new CreateSampleAction(right));
    }
    return actions;
}
