import { type BasicSample, SampleTypes } from "spessasynth_core";
import { ReplaceSampleAudioAction } from "./replace_sample_audio_action.ts";
import type { SampleDataSource } from "../core_backend/sample_data_source.ts";
import { crossfadeLoop, findLoopPoints, getFadeLength } from "./auto_loop.ts";
import type { LoopPoints } from "./trim_audio.ts";
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
 * Whether the other half of a stereo pair follows a loop edit of the sample: only when the two
 * share one loop. A partner with a loop of its own keeps it, as moving one of its points could
 * empty it.
 */
export function isLoopShared(sample: BasicSample, partner: BasicSample) {
    return (
        sample.loopStart === partner.loopStart &&
        sample.loopEnd === partner.loopEnd
    );
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
function replaceData(
    source: SampleDataSource,
    sample: BasicSample,
    data: Float32Array
) {
    return ReplaceSampleAudioAction.create(source, sample, {
        data,
        sampleRate: sample.sampleRate,
        loopStart: sample.loopStart,
        loopEnd: sample.loopEnd
    });
}

/**
 * Reads the audio of the samples of one group. The tools read and process one group at a time,
 * so a large selection is never held in memory several times at once.
 */
function readGroup(source: SampleDataSource, group: readonly BasicSample[]) {
    return Promise.all(group.map((sample) => source.readAudio(sample)));
}

/**
 * Normalizes the samples. Both halves of a stereo pair are scaled by the same amount,
 * so the balance between them stays. Silent groups are skipped.
 */
export async function createNormalizeActions(
    source: SampleDataSource,
    samples: Iterable<BasicSample>
) {
    const actions = new Array<ReplaceSampleAudioAction>();
    for (const group of getStereoGroups(samples)) {
        const audio = await readGroup(source, group);
        const peak = Math.max(...audio.map((data) => getPeak(data)));
        if (peak === 0) {
            continue;
        }
        for (const [i, sample] of group.entries()) {
            actions.push(
                await replaceData(
                    source,
                    sample,
                    audio[i].map((value) => value / peak)
                )
            );
        }
    }
    return actions;
}

/**
 * Runs the samples (and their stereo halves) through the equalizer.
 * `isClipping` tells that the result goes past full scale and will clip when saved.
 */
export async function createEqualizerActions(
    source: SampleDataSource,
    samples: Iterable<BasicSample>,
    settings: EqualizerSettings
) {
    let isClipping = false;
    const actions = new Array<ReplaceSampleAudioAction>();
    for (const sample of getStereoGroups(samples).flat()) {
        const data = applyEqualizer(
            await source.readAudio(sample),
            sample.sampleRate,
            settings
        );
        isClipping ||= getPeak(data) > 1;
        actions.push(await replaceData(source, sample, data));
    }
    return { actions, isClipping };
}

/**
 * Finds loop points and crossfades the loop. Both halves of a stereo pair get the same loop,
 * found in their mix, so they stay in phase (unless their sample rates differ).
 * `skipped` counts the samples too short to loop.
 */
export async function createAutoLoopActions(
    source: SampleDataSource,
    samples: Iterable<BasicSample>
) {
    let skipped = 0;
    const loopGroups = getStereoGroups(samples).flatMap((group) =>
        group.every((s) => s.sampleRate === group[0].sampleRate)
            ? [group]
            : group.map((s) => [s])
    );
    const actions = new Array<ReplaceSampleAudioAction>();
    for (const group of loopGroups) {
        const channels = await readGroup(source, group);
        const length = Math.min(...channels.map((c) => c.length));
        const mix = new Float32Array(length);
        for (let i = 0; i < length; i++) {
            let sum = 0;
            for (const channel of channels) {
                sum += channel[i];
            }
            mix[i] = sum / channels.length;
        }
        const { sampleRate } = group[0];
        const loop = findLoopPoints(mix, sampleRate);
        if (!loop) {
            skipped += group.length;
            continue;
        }
        const fade = getFadeLength(loop, sampleRate);
        for (const [i, sample] of group.entries()) {
            actions.push(
                await ReplaceSampleAudioAction.create(source, sample, {
                    data: crossfadeLoop(channels[i], loop, fade),
                    sampleRate,
                    loopStart: loop.start,
                    loopEnd: loop.end
                })
            );
        }
    }
    return { actions, skipped };
}

/**
 * The channels a WAV export writes: left and right for a stereo pair with the same sample rate,
 * otherwise just the sample. `isLoopOnly` cuts both channels to this sample's loop.
 * A shorter channel is padded with silence, as a WAV file needs channels of one length.
 */
export async function getExportChannels(
    source: SampleDataSource,
    sample: BasicSample,
    isLoopOnly: boolean
) {
    const cut = (data: Float32Array) =>
        isLoopOnly ? data.slice(sample.loopStart, sample.loopEnd) : data;
    const own = cut(await source.readAudio(sample));
    const linked = sample.linkedSample;
    const isLeft = sample.sampleType === SampleTypes.leftSample;
    if (
        linked?.sampleRate !== sample.sampleRate ||
        !(isLeft || sample.sampleType === SampleTypes.rightSample)
    ) {
        return [own];
    }
    const other = cut(await source.readAudio(linked));
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
 * @param loop the new loop points, by default the whole new audio
 */
export async function createReplaceAudioActions(
    source: SampleDataSource,
    sample: BasicSample,
    channels: readonly Float32Array[],
    sampleRate: number,
    loop?: LoopPoints
) {
    const replace = (target: BasicSample, data: Float32Array) =>
        ReplaceSampleAudioAction.create(source, target, {
            data,
            sampleRate,
            ...loop
        });
    let replacements: [BasicSample, Float32Array][];
    if (channels.length === 1) {
        replacements = [[sample, channels[0]]];
    } else if (channels.length === 2) {
        const [left, right] = channels;
        const linked = sample.linkedSample;
        if (linked && sample.sampleType === SampleTypes.leftSample) {
            replacements = [
                [sample, left],
                [linked, right]
            ];
        } else if (linked && sample.sampleType === SampleTypes.rightSample) {
            replacements = [
                [sample, right],
                [linked, left]
            ];
        } else {
            replacements = [
                [sample, left.map((value, i) => (value + right[i]) / 2)]
            ];
        }
    } else {
        return undefined;
    }
    return Promise.all(
        replacements.map(([target, data]) => replace(target, data))
    );
}
