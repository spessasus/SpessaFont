import { type BasicSample, SampleTypes } from "spessasynth_core";
import type { HistoryAction } from "./history.ts";
import type { BankSession } from "./bank_session.ts";
import { getObjectId } from "../utils/object_id.ts";
import { ReplaceZoneChildAction } from "../generator_table/replace_zone_child_action.ts";
import { DeleteSampleAction } from "../sample_editor/linked_instruments/delete_sample_action.ts";

/**
 * A mono sample, or a stereo pair with its left half first. A pair only merges with a pair.
 */
type SampleUnit = readonly BasicSample[];

function getUnit(sample: BasicSample) {
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
 * What a unit must still be after the audio was read for its merge to stand: the same
 * members, still in the bank, with the same properties and audio. The comparison awaits the
 * host, and the user may edit or delete a sample meanwhile.
 */
function getUnitState(session: BankSession, unit: SampleUnit) {
    const views = session.store.getSnapshot().views.samples;
    const isIntact = unit.every(
        (s, i) =>
            session.document.contains(s) &&
            getUnit(unit[0])[i] === s &&
            views.has(getObjectId(s))
    );
    if (!isIntact) {
        return undefined;
    }
    const revisions = unit.map(
        (s) => views.get(getObjectId(s))?.audioRevision ?? -1
    );
    return `${getPropertyKey(unit, (s) => session.getSampleLength(s))}#${revisions.join(",")}`;
}

function readUnit(session: BankSession, unit: SampleUnit) {
    return Promise.all(unit.map((s) => session.readAudio(s)));
}

/**
 * Finds samples with the same audio and properties (names may differ), keeps the one that
 * comes first in the bank and points every zone of the others at it, then deletes the others.
 * Stereo pairs merge as a whole with another pair. Empty samples are left alone.
 * The audio is read one unit at a time, so a large bank is never held in memory at once.
 * A sample changed or removed while the audio was read is left out.
 * @param session the bank, its samples in list order pick the kept copy
 * @param scope only these samples take part, all by default
 * @returns `createActions`, which checks the found duplicates against the bank as it is then
 * and returns the actions and how many samples they remove
 */
export async function findDuplicateSamples(
    session: BankSession,
    scope?: ReadonlySet<BasicSample>
) {
    const getLength = (s: BasicSample) => session.getSampleLength(s);
    const bankSamples = [...session.document.samples];
    const order = new Map(bankSamples.map((s, i) => [s, i]));
    const seen = new Set<BasicSample>();
    const byProperties = new Map<string, SampleUnit[]>();
    const states = new Map<SampleUnit, string | undefined>();
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
        states.set(unit, getUnitState(session, unit));
        const key = getPropertyKey(unit, getLength);
        byProperties.set(key, [...(byProperties.get(key) ?? []), unit]);
    }

    // Each removed unit and the unit it is merged into
    const merges = new Array<[SampleUnit, SampleUnit]>();
    for (const units of byProperties.values()) {
        if (units.length < 2) {
            continue;
        }
        // The kept copy comes first in the list, for a pair its left half
        units.sort((a, b) => (order.get(a[0]) ?? 0) - (order.get(b[0]) ?? 0));
        const byHash = new Map<string, SampleUnit[]>();
        for (const unit of units) {
            const audio = await readUnit(session, unit);
            const hash = audio.map((data) => hashAudio(data)).join(",");
            byHash.set(hash, [...(byHash.get(hash) ?? []), unit]);
        }
        for (const bucket of byHash.values()) {
            if (bucket.length < 2) {
                continue;
            }
            // Only the kept copies stay read, one unless the hashes collide
            const kept = new Array<{
                unit: SampleUnit;
                audio: Float32Array[];
            }>();
            for (const unit of bucket) {
                const audio = await readUnit(session, unit);
                const match = kept.find((k) =>
                    k.audio.every((data, c) => isSameAudio(data, audio[c]))
                );
                if (match) {
                    merges.push([unit, match.unit]);
                } else {
                    kept.push({ unit, audio });
                }
            }
        }
    }

    // Built when the caller applies them, as another merge or an edit may come between the
    // last read and the apply
    const createActions = () => {
        const replacements = new Map<BasicSample, BasicSample>();
        for (const [removed, keptUnit] of merges) {
            const isUnchanged = [removed, keptUnit].every((unit) => {
                const state = states.get(unit);
                return (
                    state !== undefined && state === getUnitState(session, unit)
                );
            });
            if (!isUnchanged) {
                continue;
            }
            for (const [c, sample] of removed.entries()) {
                replacements.set(sample, keptUnit[c]);
            }
        }

        const actions = new Array<HistoryAction>();
        for (const [removed, keptSample] of replacements) {
            const instruments = new Set(removed.linkedTo);
            for (const instrument of instruments) {
                for (const zone of instrument.zones) {
                    if (zone.sample === removed) {
                        actions.push(
                            new ReplaceZoneChildAction(
                                instrument,
                                zone,
                                keptSample
                            )
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
    };
    return { createActions };
}
