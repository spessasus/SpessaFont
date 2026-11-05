import { type BasicSample, GeneratorTypes } from "spessasynth_core";
import type { SampleDataSource } from "../core_backend/sample_data_source.ts";
import { ReplaceSampleAudioAction } from "./replace_sample_audio_action.ts";
import { getStereoGroups } from "./sample_audio.ts";
import { getSilenceCut, getTrimmedLength, shiftLoop } from "./trim_audio.ts";

/**
 * Removes the silence at the start of the samples. Both halves of a stereo pair with one rate
 * lose the same number of frames, so they stay in sync. `silent` counts the samples that are
 * silent all the way and were left alone.
 */
export async function createRemoveSilenceActions(
    source: SampleDataSource,
    samples: Iterable<BasicSample>
) {
    let silent = 0;
    const groups = getStereoGroups(samples).flatMap((group) =>
        group.every((s) => s.sampleRate === group[0].sampleRate)
            ? [group]
            : group.map((s) => [s])
    );
    const actions = new Array<Promise<ReplaceSampleAudioAction>>();
    for (const group of groups) {
        const channels = await Promise.all(
            group.map((s) => source.readAudio(s))
        );
        const cut = getSilenceCut(channels, group[0].sampleRate, group);
        if (cut === undefined) {
            silent += group.length;
            continue;
        }
        if (cut === 0) {
            continue;
        }
        for (const [i, sample] of group.entries()) {
            const data = channels[i];
            actions.push(
                ReplaceSampleAudioAction.create(source, sample, {
                    data: data.slice(cut),
                    sampleRate: sample.sampleRate,
                    ...shiftLoop(sample, data.length, cut)
                })
            );
        }
    }
    return { actions: await Promise.all(actions), silent };
}

/**
 * Whether a zone plays the sample without holding its loop to the end: "no loop", the default,
 * or "loop until release", which plays past the loop on release.
 */
function isPlayedPastLoop(sample: BasicSample) {
    return sample.linkedTo.some((instrument) =>
        instrument.zones.some((zone) => {
            if (zone.sample !== sample) {
                return false;
            }
            const mode = zone.getGenerator(
                GeneratorTypes.sampleModes,
                instrument.globalZone.getGenerator(
                    GeneratorTypes.sampleModes,
                    0
                )
            );
            return mode === 0 || mode === 3;
        })
    );
}

/**
 * Cuts the audio after each sample's loop end, keeping a short tail. `skipped` counts the
 * samples without a loop or with nothing after it, `losesTail` the trimmed samples a zone
 * plays past the loop, which lose some of their sound.
 */
export async function createTrimAfterLoopActions(
    source: SampleDataSource,
    samples: Iterable<BasicSample>
) {
    let skipped = 0;
    let losesTail = 0;
    const actions = new Array<Promise<ReplaceSampleAudioAction>>();
    for (const sample of getStereoGroups(samples).flat()) {
        const data = await source.readAudio(sample);
        const length = getTrimmedLength(sample, data.length);
        if (length === undefined) {
            skipped++;
            continue;
        }
        if (isPlayedPastLoop(sample)) {
            losesTail++;
        }
        actions.push(
            ReplaceSampleAudioAction.create(source, sample, {
                data: data.slice(0, length),
                sampleRate: sample.sampleRate,
                loopStart: sample.loopStart,
                loopEnd: sample.loopEnd
            })
        );
    }
    return { actions: await Promise.all(actions), skipped, losesTail };
}
