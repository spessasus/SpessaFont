import { type BasicSample, SampleTypes } from "spessasynth_core";
import { ReplaceSampleAudioAction } from "./replace_sample_audio_action.ts";
import {
    applyEqualizer,
    type EqualizerSettings
} from "./equalizer/equalizer.ts";

/**
 * The loudest absolute value of the audio.
 */
export function getPeak(data: Float32Array) {
    let peak = 0;
    for (const value of data) {
        peak = Math.max(peak, Math.abs(value));
    }
    return peak;
}

/**
 * The sample and, for the left or right half of a stereo pair, the other half.
 * Audio tools process both, so the channels stay alike.
 */
export function getStereoGroup(sample: BasicSample) {
    const linked = sample.linkedSample;
    const isStereo =
        sample.sampleType === SampleTypes.leftSample ||
        sample.sampleType === SampleTypes.rightSample;
    return linked && isStereo ? [sample, linked] : [sample];
}

/**
 * The stereo groups of the given samples, each group once.
 */
export function getStereoGroups(samples: Iterable<BasicSample>) {
    const seen = new Set<BasicSample>();
    const groups = new Array<BasicSample[]>();
    for (const sample of samples) {
        if (seen.has(sample)) {
            continue;
        }
        const group = getStereoGroup(sample);
        for (const member of group) {
            seen.add(member);
        }
        groups.push(group);
    }
    return groups;
}

/**
 * An action that changes the audio but keeps its length, so the loop points stay.
 */
function replaceData(sample: BasicSample, data: Float32Array) {
    return new ReplaceSampleAudioAction(sample, {
        data,
        sampleRate: sample.sampleRate,
        loopStart: sample.loopStart,
        loopEnd: sample.loopEnd
    });
}

/**
 * Normalizes the samples. Both halves of a stereo pair are scaled by the same amount,
 * so the balance between them stays. Silent groups are skipped.
 */
export function createNormalizeActions(samples: Iterable<BasicSample>) {
    return getStereoGroups(samples).flatMap((group) => {
        const peak = Math.max(...group.map((s) => getPeak(s.getAudioData())));
        return peak === 0
            ? []
            : group.map((sample) =>
                  replaceData(
                      sample,
                      sample.getAudioData().map((value) => value / peak)
                  )
              );
    });
}

/**
 * Runs the samples (and their stereo halves) through the equalizer.
 * `isClipping` tells that the result goes past full scale and will clip when saved.
 */
export function createEqualizerActions(
    samples: Iterable<BasicSample>,
    settings: EqualizerSettings
) {
    let isClipping = false;
    const actions = getStereoGroups(samples)
        .flat()
        .map((sample) => {
            const data = applyEqualizer(
                sample.getAudioData(),
                sample.sampleRate,
                settings
            );
            isClipping ||= getPeak(data) > 1;
            return replaceData(sample, data);
        });
    return { actions, isClipping };
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
