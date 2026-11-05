import { type BasicSample, EmptySample, SampleTypes } from "spessasynth_core";
import { CreateSampleAction } from "./create_actions/create_sample_action.ts";
import { getRootKeyFromName } from "../utils/root_key_from_name.ts";
import { logError } from "../utils/core_utils.ts";
import { readWavLoop } from "./wav_loop.ts";
import {
    type AudioDecoder,
    decodeAudioFile
} from "../utils/decode_audio_file.ts";
import {
    getSilenceCut,
    getTrimmedLength,
    type LoopPoints,
    shiftLoop
} from "../sample_editor/trim_audio.ts";
import type { SavedSettingsType } from "../settings/save_load/settings_typedef.ts";

/**
 * Sample names leave room for the "L" or "R" of a stereo pair.
 */
const MAX_BASE_NAME_LENGTH = 39;

/**
 * What to do with the audio of an imported file, from the settings.
 */
export interface ImportOptions {
    removeSilence: boolean;
    trimAfterLoop: boolean;
}

export const PLAIN_IMPORT: ImportOptions = {
    removeSilence: false,
    trimAfterLoop: false
};

export function getImportOptions(settings: SavedSettingsType): ImportOptions {
    return {
        removeSilence: settings.removeImportSilence,
        trimAfterLoop: settings.trimImportAfterLoop
    };
}

/**
 * Applies the import options to decoded channels: the silence at the start goes from all
 * channels alike, and with a loop from the file, the audio after it goes.
 * @param channels the decoded channels, of one length
 * @param sampleRate their rate
 * @param fileLoop the loop the file carries, if any
 * @param options what to do
 */
export function prepareImportedAudio(
    channels: readonly Float32Array[],
    sampleRate: number,
    fileLoop: LoopPoints | undefined,
    options: ImportOptions
) {
    let result = channels;
    let length = channels[0]?.length ?? 0;
    // Without a loop in the file, the whole sample loops, like replaced audio
    let loop = fileLoop ?? { loopStart: 0, loopEnd: length };
    if (options.removeSilence) {
        const cut = getSilenceCut(
            result,
            sampleRate,
            result.map(() => loop)
        );
        if (cut !== undefined && cut > 0) {
            result = result.map((data) => data.slice(cut));
            loop = shiftLoop(loop, length, cut);
            length -= cut;
        }
    }
    if (fileLoop && options.trimAfterLoop) {
        const trimmed = getTrimmedLength(loop, length);
        if (trimmed !== undefined) {
            result = result.map((data) => data.slice(0, trimmed));
        }
    }
    return { channels: result, loop };
}

/**
 * Decodes an audio file into a sample, or a stereo pair for a stereo file, named after the
 * file. A note in the name ("Piano C4") becomes the root key, and the loop of a WAV file is
 * kept. Throws when the file cannot be decoded.
 */
async function decodeSampleFile(
    context: AudioDecoder,
    file: File,
    options: ImportOptions
) {
    const buffer = await file.arrayBuffer();
    // Read first, decoding takes the buffer
    const wavLoop = readWavLoop(buffer);
    const audioBuffer = await decodeAudioFile(context, buffer);
    const dotIndex = file.name.lastIndexOf(".");
    const baseName = (
        dotIndex === -1 ? file.name : file.name.slice(0, dotIndex)
    ).slice(0, MAX_BASE_NAME_LENGTH);
    const isStereo = audioBuffer.numberOfChannels > 1;
    const { sampleRate } = audioBuffer;
    const rootKey = getRootKeyFromName(baseName);

    // The browser decodes at its own rate, so the file's loop is scaled to it
    const ratio = wavLoop ? sampleRate / wavLoop.sampleRate : 1;
    const fileLoop = wavLoop
        ? {
              loopStart: Math.min(
                  audioBuffer.length,
                  Math.round(wavLoop.start * ratio)
              ),
              loopEnd: Math.min(
                  audioBuffer.length,
                  Math.round(wavLoop.end * ratio)
              )
          }
        : undefined;
    const decoded = Array.from({ length: isStereo ? 2 : 1 }, (_, i) =>
        audioBuffer.getChannelData(i)
    );
    const { channels, loop } = prepareImportedAudio(
        decoded,
        sampleRate,
        fileLoop,
        options
    );

    const createSample = (name: string, data: Float32Array) => {
        const sample = new EmptySample();
        sample.name = name;
        sample.setAudioData(data, sampleRate);
        sample.loopStart = loop.loopStart;
        sample.loopEnd = loop.loopEnd;
        if (rootKey !== undefined) sample.originalKey = rootKey;
        return sample;
    };
    const sample = createSample(baseName + (isStereo ? "L" : ""), channels[0]);
    const samples = [sample];
    if (isStereo) {
        const right = createSample(baseName + "R", channels[1]);
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
    files: readonly File[],
    options = PLAIN_IMPORT
) {
    const samples = new Array<BasicSample>();
    const failed = new Array<string>();
    for (const file of files) {
        try {
            samples.push(...(await decodeSampleFile(context, file, options)));
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
