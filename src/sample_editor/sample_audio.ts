import { type BasicSample, SampleTypes } from "spessasynth_core";
import { ReplaceSampleAudioAction } from "./replace_sample_audio_action.ts";
import type { SampleDataSource } from "../core_backend/sample_data_source.ts";
import { crossfadeLoop, findLoopPoints, getFadeLength } from "./auto_loop.ts";
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
 * Reads the audio of each sample of each group.
 */
function readGroups(source: SampleDataSource, groups: BasicSample[][]) {
    return Promise.all(
        groups.map((group) =>
            Promise.all(group.map((sample) => source.readAudio(sample)))
        )
    );
}

/**
 * Normalizes the samples. Both halves of a stereo pair are scaled by the same amount,
 * so the balance between them stays. Silent groups are skipped.
 */
export async function createNormalizeActions(
    source: SampleDataSource,
    samples: Iterable<BasicSample>
) {
    const groups = getStereoGroups(samples);
    const audio = await readGroups(source, groups);
    const actions = groups.flatMap((group, i) => {
        const peak = Math.max(...audio[i].map((data) => getPeak(data)));
        return peak === 0
            ? []
            : group.map((sample, j) =>
                  replaceData(
                      source,
                      sample,
                      audio[i][j].map((value) => value / peak)
                  )
              );
    });
    return Promise.all(actions);
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
    const all = getStereoGroups(samples).flat();
    const audio = await Promise.all(all.map((s) => source.readAudio(s)));
    const actions = await Promise.all(
        all.map((sample, i) => {
            const data = applyEqualizer(audio[i], sample.sampleRate, settings);
            isClipping ||= getPeak(data) > 1;
            return replaceData(source, sample, data);
        })
    );
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
    const audio = await readGroups(source, loopGroups);
    const actions = loopGroups.flatMap((group, groupIndex) => {
        const channels = audio[groupIndex];
        const length = Math.min(...channels.map((c) => c.length));
        const mix = Float32Array.from(
            { length },
            (_, i) =>
                channels.reduce((sum, c) => sum + c[i], 0) / channels.length
        );
        const { sampleRate } = group[0];
        const loop = findLoopPoints(mix, sampleRate);
        if (!loop) {
            skipped += group.length;
            return [];
        }
        const fade = getFadeLength(loop, sampleRate);
        return group.map((sample, i) =>
            ReplaceSampleAudioAction.create(source, sample, {
                data: crossfadeLoop(channels[i], loop, fade),
                sampleRate,
                loopStart: loop.start,
                loopEnd: loop.end
            })
        );
    });
    return { actions: await Promise.all(actions), skipped };
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
 */
export async function createReplaceAudioActions(
    source: SampleDataSource,
    sample: BasicSample,
    channels: readonly Float32Array[],
    sampleRate: number
) {
    const replace = (target: BasicSample, data: Float32Array) =>
        ReplaceSampleAudioAction.create(source, target, { data, sampleRate });
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
