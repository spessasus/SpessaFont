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
