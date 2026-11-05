import { type BasicSample, EmptySample, SampleTypes } from "spessasynth_core";
import { CreateSampleAction } from "./create_actions/create_sample_action.ts";
import { getRootKeyFromName } from "../utils/root_key_from_name.ts";
import { logError } from "../utils/core_utils.ts";
import { readWavLoop, readWavRootKey } from "./wav_loop.ts";
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
import { getFreeName } from "../utils/element_name.ts";

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
 * Decodes an audio file, keeps the loop of a WAV file and applies the import options.
 * Only the first two channels are kept, `channelCount` tells how many the file has.
 * Throws when the file cannot be decoded.
 */
export async function decodeImportedAudio(
    context: AudioDecoder,
    buffer: ArrayBuffer,
    options: ImportOptions
) {
    // Read first, decoding takes the buffer
    const wavLoop = readWavLoop(buffer);
    const audioBuffer = await decodeAudioFile(context, buffer);
    const { sampleRate, numberOfChannels } = audioBuffer;

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
    const decoded = Array.from(
        { length: Math.min(numberOfChannels, 2) },
        (_, i) => audioBuffer.getChannelData(i)
    );
    const { channels, loop } = prepareImportedAudio(
        decoded,
        sampleRate,
        fileLoop,
        options
    );
    return { channels, loop, sampleRate, channelCount: numberOfChannels };
}

/**
 * Decodes an audio file into a sample, or a stereo pair for a stereo file, named after the
 * file (with a number when the name is taken). A note in the name ("Piano C4") becomes the root
 * key, or else the unity note of a WAV file, and the loop of a WAV file is kept. Throws when the
 * file cannot be decoded.
 */
async function decodeSampleFile(
    context: AudioDecoder,
    file: File,
    options: ImportOptions,
    isTaken: (name: string) => boolean
) {
    const buffer = await file.arrayBuffer();
    // Read first, decoding takes the buffer
    const wavKey = readWavRootKey(buffer);
    const { channels, loop, sampleRate } = await decodeImportedAudio(
        context,
        buffer,
        options
    );
    const dotIndex = file.name.lastIndexOf(".");
    const fileName = (
        dotIndex === -1 ? file.name : file.name.slice(0, dotIndex)
    ).slice(0, MAX_BASE_NAME_LENGTH);
    const isStereo = channels.length > 1;
    const baseName = getFreeName(fileName, (name) =>
        isStereo ? isTaken(name + "L") || isTaken(name + "R") : isTaken(name)
    );
    const nameKey = getRootKeyFromName(fileName);

    const createSample = (name: string, data: Float32Array) => {
        const sample = new EmptySample();
        sample.name = name;
        sample.setAudioData(data, sampleRate);
        sample.loopStart = loop.loopStart;
        sample.loopEnd = loop.loopEnd;
        if (nameKey !== undefined) {
            sample.originalKey = nameKey;
        } else if (wavKey) {
            sample.originalKey = wavKey.key;
            sample.pitchCorrection = wavKey.pitchCorrection;
        }
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
 * How to import files, all optional.
 */
interface ImportRequest {
    options?: ImportOptions;
    /**
     * The names of the samples in the bank. New samples get other names.
     */
    takenNames?: Iterable<string>;
    /**
     * Called before each file with how many files are done.
     */
    onProgress?: (done: number, total: number) => void;
}

/**
 * Decodes several audio files into the actions that add them, for one undo step.
 * `samples` are the new samples and `failed` the names of the files that could not be decoded.
 */
export async function createSamplesImportActions(
    context: AudioDecoder,
    files: readonly File[],
    { options = PLAIN_IMPORT, takenNames = [], onProgress }: ImportRequest = {}
) {
    const samples = new Array<BasicSample>();
    const failed = new Array<string>();
    const taken = new Set(takenNames);
    for (const [i, file] of files.entries()) {
        onProgress?.(i, files.length);
        try {
            const decoded = await decodeSampleFile(
                context,
                file,
                options,
                (n) => taken.has(n)
            );
            for (const sample of decoded) {
                taken.add(sample.name);
            }
            samples.push(...decoded);
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
