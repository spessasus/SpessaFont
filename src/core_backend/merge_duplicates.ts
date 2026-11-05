import { type BasicSample, SampleTypes } from "spessasynth_core";
import type { HistoryAction } from "./history.ts";
import type { SampleDataSource } from "./sample_data_source.ts";
import { ReplaceZoneChildAction } from "../generator_table/replace_zone_child_action.ts";
import { DeleteSampleAction } from "../sample_editor/linked_instruments/delete_sample_action.ts";

/**
 * A mono sample, or a stereo pair with its left half first. A pair only merges with a pair.
 */
type SampleUnit = readonly BasicSample[];

function getUnit(sample: BasicSample): SampleUnit {
    const partner = sample.linkedSample;
    if (partner?.linkedSample !== sample) {
        return [sample];
    }
    if (sample.sampleType === SampleTypes.leftSample) {
        return [sample, partner];
    }
    if (sample.sampleType === SampleTypes.rightSample) {
        return [partner, sample];
    }
    return [sample];
}

/**
 * Everything but the audio and the name that must match, so only units that match here have
 * their audio read.
 */
function getPropertyKey(
    unit: SampleUnit,
    getLength: (s: BasicSample) => number
) {
    return unit
        .map((s) =>
            [
                s.sampleType,
                getLength(s),
                s.sampleRate,
                s.loopStart,
                s.loopEnd,
                s.originalKey,
                s.pitchCorrection
            ].join(",")
        )
        .join("|");
}

/**
 * FNV-1a over the bits of the audio, to find equal audio without comparing every pair.
 */
function hashAudio(data: Float32Array) {
    const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    let hash = 0x81_1c_9d_c5;
    for (const byte of bytes) {
        hash = Math.imul(hash ^ byte, 0x01_00_01_93);
    }
    return hash >>> 0;
}

function isSameAudio(a: Float32Array, b: Float32Array) {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        // Compared as bits, so -0 and 0 differ, as they would in the file
        if (!Object.is(a[i], b[i])) {
            return false;
        }
    }
    return true;
}

/**
 * Finds samples with the same audio and properties (names may differ), keeps the one that
 * comes first in the bank and points every zone of the others at it, then deletes the others.
 * Stereo pairs merge as a whole with another pair. Empty samples are left alone.
 * @param source where the audio is read from
 * @param bankSamples the bank's samples, in list order, which picks the kept copy
 * @param scope only these samples take part, all by default
 * @param getLength the length of a sample, which the store knows best (its views)
 * @returns the actions and how many samples they remove
 */
export async function createMergeDuplicateActions(
    source: SampleDataSource,
    bankSamples: readonly BasicSample[],
    scope: ReadonlySet<BasicSample> | undefined,
    getLength: (sample: BasicSample) => number = (s) => s.sampleLength
) {
    const order = new Map(bankSamples.map((s, i) => [s, i]));
    const seen = new Set<BasicSample>();
    const byProperties = new Map<string, SampleUnit[]>();
    for (const sample of bankSamples) {
        if (seen.has(sample) || (scope && !scope.has(sample))) {
            continue;
        }
        const unit = getUnit(sample);
        for (const member of unit) {
            seen.add(member);
        }
        if (unit.some((s) => getLength(s) === 0)) {
            continue;
        }
        const key = getPropertyKey(unit, getLength);
        byProperties.set(key, [...(byProperties.get(key) ?? []), unit]);
    }

    const replacements = new Map<BasicSample, BasicSample>();
    for (const units of byProperties.values()) {
        if (units.length < 2) {
            continue;
        }
        // The kept copy comes first in the list, for a pair its left half
        units.sort((a, b) => (order.get(a[0]) ?? 0) - (order.get(b[0]) ?? 0));
        const audio = await Promise.all(
            units.map((unit) =>
                Promise.all(unit.map((s) => source.readAudio(s)))
            )
        );
        const hashes = audio.map((channels) =>
            channels.map((data) => hashAudio(data)).join(",")
        );
        const kept = new Array<number>();
        for (const [i, unit] of units.entries()) {
            const match = kept.find(
                (k) =>
                    hashes[k] === hashes[i] &&
                    audio[k].every((data, c) => isSameAudio(data, audio[i][c]))
            );
            if (match === undefined) {
                kept.push(i);
                continue;
            }
            for (const [c, sample] of unit.entries()) {
                replacements.set(sample, units[match][c]);
            }
        }
    }

    const actions = new Array<HistoryAction>();
    for (const [removed, keptSample] of replacements) {
        const instruments = new Set(removed.linkedTo);
        for (const instrument of instruments) {
            for (const zone of instrument.zones) {
                if (zone.sample === removed) {
                    actions.push(
                        new ReplaceZoneChildAction(instrument, zone, keptSample)
                    );
                }
            }
        }
    }
    // Zones first, as a sample in use cannot be deleted
    for (const removed of replacements.keys()) {
        actions.push(new DeleteSampleAction(removed));
    }
    return { actions, removedCount: replacements.size };
}
