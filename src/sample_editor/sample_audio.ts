import { type BasicSample, SampleTypes } from "spessasynth_core";
import { ReplaceSampleAudioAction } from "./replace_sample_audio_action.ts";

/**
 * Scales the audio so its loudest point is at full scale.
 * Silent audio is returned unchanged.
 */
export function normalizeAudio(data: Float32Array) {
    let peak = 0;
    for (const value of data) {
        peak = Math.max(peak, Math.abs(value));
    }
    return peak === 0 ? data : data.map((value) => value / peak);
}

/**
 * The channels a WAV export writes: left and right for a stereo pair with the same sample rate,
 * otherwise just the sample. `isLoopOnly` cuts both channels to this sample's loop.
 * A shorter channel is padded with silence, as a WAV file needs channels of one length.
 */
export function getExportChannels(sample: BasicSample, isLoopOnly: boolean) {
    const cut = (data: Float32Array) =>
        isLoopOnly ? data.slice(sample.loopStart, sample.loopEnd) : data;
    const own = cut(sample.getAudioData());
    const linked = sample.linkedSample;
    const isLeft = sample.sampleType === SampleTypes.leftSample;
    if (
        linked?.sampleRate !== sample.sampleRate ||
        !(isLeft || sample.sampleType === SampleTypes.rightSample)
    ) {
        return [own];
    }
    const other = cut(linked.getAudioData());
    const length = Math.max(own.length, other.length);
    const pad = (data: Float32Array) => {
        if (data.length === length) {
            return data;
        }
        const padded = new Float32Array(length);
        padded.set(data);
        return padded;
    };
    return isLeft ? [pad(own), pad(other)] : [pad(other), pad(own)];
}

/**
 * The actions that replace a sample's audio with decoded channels.
 * Two channels go to a stereo pair (left and right), or are mixed to mono for a mono sample.
 * Returns undefined for more than two channels.
 */
export function createReplaceAudioActions(
    sample: BasicSample,
    channels: readonly Float32Array[],
    sampleRate: number
) {
    if (channels.length === 1) {
        return [
            new ReplaceSampleAudioAction(sample, {
                data: channels[0],
                sampleRate
            })
        ];
    }
    if (channels.length !== 2) {
        return undefined;
    }
    const [left, right] = channels;
    const linked = sample.linkedSample;
    if (linked && sample.sampleType === SampleTypes.leftSample) {
        return [
            new ReplaceSampleAudioAction(sample, { data: left, sampleRate }),
            new ReplaceSampleAudioAction(linked, { data: right, sampleRate })
        ];
    }
    if (linked && sample.sampleType === SampleTypes.rightSample) {
        return [
            new ReplaceSampleAudioAction(sample, { data: right, sampleRate }),
            new ReplaceSampleAudioAction(linked, { data: left, sampleRate })
        ];
    }
    const mono = left.map((value, i) => (value + right[i]) / 2);
    return [new ReplaceSampleAudioAction(sample, { data: mono, sampleRate })];
}
