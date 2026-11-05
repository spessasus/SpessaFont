import {
    type BasicInstrument,
    type BasicSample,
    type BasicZone,
    type GeneratorType,
    GeneratorTypes
} from "spessasynth_core";
import type { SampleDataSource } from "../core_backend/sample_data_source.ts";
import type { HistoryAction } from "../core_backend/history.ts";
import { ReplaceSampleAudioAction } from "./replace_sample_audio_action.ts";
import { getStereoGroups } from "./sample_audio.ts";
import { getSilenceCut, getTrimmedLength, shiftLoop } from "./trim_audio.ts";
import { SetGeneratorAction } from "../generator_table/cell/set_generator_action.ts";
import {
    COARSE_OFFSET_SIZE,
    getCoarseOffsetGenerator,
    type OffsetGenerator
} from "../generator_table/cell/offset_generator.ts";

/**
 * Each instrument zone that plays the sample, with its instrument.
 */
function getSampleZones(sample: BasicSample) {
    return [...new Set(sample.linkedTo)].flatMap((instrument) =>
        instrument.zones
            .filter((zone) => zone.sample === sample)
            .map((zone) => ({ instrument, zone }))
    );
}

/**
 * A generator of the zone, or of the instrument's global zone when the zone does not set it.
 */
function getZoneValue(
    instrument: BasicInstrument,
    zone: BasicZone,
    generator: GeneratorType
) {
    return zone.getGenerator(
        generator,
        instrument.globalZone.getGenerator(generator, 0)
    );
}

/**
 * The offset a zone plays with in frames, fine and coarse together.
 */
function getOffset(
    instrument: BasicInstrument,
    zone: BasicZone,
    generator: OffsetGenerator
) {
    return (
        getZoneValue(instrument, zone, generator) +
        getZoneValue(instrument, zone, getCoarseOffsetGenerator(generator)) *
            COARSE_OFFSET_SIZE
    );
}

/**
 * The actions that give the zone its own offset. The global zone's offset stays, other zones
 * may use it.
 */
function createOffsetActions(
    instrument: BasicInstrument,
    zone: BasicZone,
    generator: OffsetGenerator,
    offset: number
) {
    const coarse = getCoarseOffsetGenerator(generator);
    const values = [
        [generator, offset % COARSE_OFFSET_SIZE],
        [coarse, Math.trunc(offset / COARSE_OFFSET_SIZE)]
    ] as const;
    return values.flatMap(([type, value]) => {
        const old = zone.getGenerator(type, null);
        // Left unset when the zone gets the same from the global zone
        const next =
            old === null &&
            value === instrument.globalZone.getGenerator(type, 0)
                ? null
                : value;
        return next === old
            ? []
            : [new SetGeneratorAction(instrument, zone, type, old, next)];
    });
}

/**
 * Removes the silence at the start of the samples. Both halves of a stereo pair with one rate
 * lose the same number of frames, so they stay in sync. A zone that starts later in the sample
 * keeps starting on the same sound. `silent` counts the samples that are silent all the way and
 * were left alone, `isBlockedByLoop` tells that a loop at the very start kept silence in.
 */
export async function createRemoveSilenceActions(
    source: SampleDataSource,
    samples: Iterable<BasicSample>
) {
    let silent = 0;
    let isBlockedByLoop = false;
    const groups = getStereoGroups(samples).flatMap((group) =>
        group.every((s) => s.sampleRate === group[0].sampleRate)
            ? [group]
            : group.map((s) => [s])
    );
    const actions = new Array<HistoryAction>();
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
            // The sound starts later, but a loop starting at 0 may not be cut into
            isBlockedByLoop ||=
                getSilenceCut(channels, group[0].sampleRate, []) !== 0;
            continue;
        }
        for (const [i, sample] of group.entries()) {
            const data = channels[i];
            actions.push(
                await ReplaceSampleAudioAction.create(source, sample, {
                    data: data.slice(cut),
                    sampleRate: sample.sampleRate,
                    ...shiftLoop(sample, data.length, cut)
                })
            );
            // The loop offsets follow the loop points and the end offset the end, only the
            // start offset counts from the start that moved
            for (const { instrument, zone } of getSampleZones(sample)) {
                const start = getOffset(
                    instrument,
                    zone,
                    GeneratorTypes.startAddrsOffset
                );
                if (start > 0) {
                    actions.push(
                        ...createOffsetActions(
                            instrument,
                            zone,
                            GeneratorTypes.startAddrsOffset,
                            Math.max(0, start - cut)
                        )
                    );
                }
            }
        }
    }
    return { actions, silent, isBlockedByLoop };
}

/**
 * Cuts the audio after each sample's loop end, keeping a short tail. A zone that ends earlier
 * keeps ending on the same frame. `skipped` counts the samples without a loop or with nothing
 * after it, `losesTail` the trimmed samples a zone plays past the new end (a zone that does not
 * loop all the way, or a loop that an offset moves past the end), which lose some of their sound.
 */
export async function createTrimAfterLoopActions(
    source: SampleDataSource,
    samples: Iterable<BasicSample>
) {
    let skipped = 0;
    let losesTail = 0;
    const actions = new Array<HistoryAction>();
    for (const sample of getStereoGroups(samples).flat()) {
        const data = await source.readAudio(sample);
        const length = getTrimmedLength(sample, data.length);
        if (length === undefined) {
            skipped++;
            continue;
        }
        actions.push(
            await ReplaceSampleAudioAction.create(source, sample, {
                data: data.slice(0, length),
                sampleRate: sample.sampleRate,
                loopStart: sample.loopStart,
                loopEnd: sample.loopEnd
            })
        );
        let isTailLost = false;
        for (const { instrument, zone } of getSampleZones(sample)) {
            // Counted from the end of the sample, which moves
            const endOffset = getOffset(
                instrument,
                zone,
                GeneratorTypes.endAddrOffset
            );
            const end = data.length + endOffset;
            const loopEnd =
                sample.loopEnd +
                getOffset(instrument, zone, GeneratorTypes.endloopAddrsOffset);
            // Only "loop" holds the loop to the end, the other modes play past it
            const isLooped =
                getZoneValue(instrument, zone, GeneratorTypes.sampleModes) ===
                1;
            isTailLost ||= (isLooped ? loopEnd : end) > length;
            actions.push(
                ...createOffsetActions(
                    instrument,
                    zone,
                    GeneratorTypes.endAddrOffset,
                    Math.min(0, end - length)
                )
            );
        }
        if (isTailLost) {
            losesTail++;
        }
    }
    return { actions, skipped, losesTail };
}
