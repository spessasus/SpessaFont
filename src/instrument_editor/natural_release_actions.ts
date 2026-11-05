import {
    type BasicInstrument,
    type BasicInstrumentZone,
    GeneratorLimits,
    type GeneratorType,
    GeneratorTypes
} from "spessasynth_core";
import { SetGeneratorAction } from "../generator_table/cell/set_generator_action.ts";
import {
    clamp,
    getGeneratorRange
} from "../generator_table/generator_range.ts";
import { s2tc } from "../utils/conversion_helpers.ts";
import {
    getPlayedGenerator,
    getPlayedRange
} from "../generator_table/played_value.ts";

/**
 * The key the release time is given for.
 */
export const RELEASE_REFERENCE_KEY = 36;

export interface NaturalRelease {
    /**
     * The release at the reference key, in seconds.
     */
    seconds: number;
    /**
     * What the release is multiplied by for each octave up.
     */
    factorPerOctave: number;
    /**
     * How far the pitch glides during the release, in cents. 0 for none.
     */
    detune: number;
}

/**
 * The modulation envelope generators the detune takes over.
 */
const MOD_ENVELOPE = [
    GeneratorTypes.delayModEnv,
    GeneratorTypes.attackModEnv,
    GeneratorTypes.holdModEnv,
    GeneratorTypes.decayModEnv,
    GeneratorTypes.sustainModEnv,
    GeneratorTypes.releaseModEnv,
    GeneratorTypes.modEnvToPitch
] as const;

const minimum = (generator: GeneratorType) =>
    getGeneratorRange(generator, true).min;

/**
 * The envelope the detune sets: full right away and held until the release.
 */
const HELD_ENVELOPE = [
    [GeneratorTypes.delayModEnv, minimum(GeneratorTypes.delayModEnv)],
    [GeneratorTypes.attackModEnv, minimum(GeneratorTypes.attackModEnv)],
    [GeneratorTypes.holdModEnv, minimum(GeneratorTypes.holdModEnv)],
    [GeneratorTypes.decayModEnv, minimum(GeneratorTypes.decayModEnv)],
    // 0 is no decrease, the envelope stays at its peak
    [GeneratorTypes.sustainModEnv, 0]
] as const;

/**
 * The detune an earlier run left in the zone, which its tuning includes, or 0. Running again
 * starts from the tuning before it, so the same input gives the same values.
 */
function getEarlierDetune(zone: BasicInstrumentZone) {
    const toPitch = zone.getGenerator(GeneratorTypes.modEnvToPitch, null);
    const isHeld = HELD_ENVELOPE.every(
        ([generator, value]) => zone.getGenerator(generator, null) === value
    );
    return toPitch !== null && isHeld ? -toPitch : 0;
}

/**
 * Whether a detune would replace a modulation envelope the zone plays, its own or the global
 * zone's. The envelope of an earlier run does not count, a new run replaces it anyway.
 */
export function isEnvelopeReplaced(
    instrument: BasicInstrument,
    zone: BasicInstrumentZone
) {
    return (
        getEarlierDetune(zone) === 0 &&
        MOD_ENVELOPE.some(
            (g) =>
                getPlayedGenerator(instrument, zone, g) !==
                GeneratorLimits[g].def
        )
    );
}

/**
 * The release in timecents at a key, clamped to what the generator takes.
 */
export function getReleaseTimecents(key: number, release: NaturalRelease) {
    const seconds =
        release.seconds *
        Math.pow(release.factorPerOctave, (key - RELEASE_REFERENCE_KEY) / 12);
    const raw = Math.round(s2tc(seconds));
    const { min, max } = getGeneratorRange(GeneratorTypes.releaseVolEnv, true);
    return { value: clamp(raw, min, max), isClamped: raw < min || raw > max };
}

/**
 * Gives every zone of the instruments a release that shortens with pitch (with a factor below
 * 1), from the center of the keys it plays. With a detune, the modulation envelope stays full
 * while the key is held and falls with the release, and the tuning is raised by the same amount
 * it takes away, so the pitch is right while held and glides by the detune on release. A detune
 * of 0 removes the one an earlier run left. `clamped` counts the zones whose release had to be
 * clamped, `overwritten` the zones whose modulation envelope the detune replaced.
 */
export function createNaturalReleaseActions(
    instruments: Iterable<BasicInstrument>,
    release: NaturalRelease
) {
    const actions = new Array<SetGeneratorAction>();
    let clamped = 0;
    let overwritten = 0;
    for (const instrument of instruments) {
        const set = (
            zone: BasicInstrumentZone,
            generator: GeneratorType,
            value: number | null
        ) => {
            const own = zone.getGenerator(generator, null);
            if (own !== value) {
                actions.push(
                    new SetGeneratorAction(
                        instrument,
                        zone,
                        generator,
                        own,
                        value
                    )
                );
            }
        };
        const setClamped = (
            zone: BasicInstrumentZone,
            generator: GeneratorType,
            value: number
        ) => {
            const { min, max } = getGeneratorRange(generator, true);
            set(zone, generator, clamp(value, min, max));
        };
        for (const zone of instrument.zones) {
            const { min, max } = getPlayedRange(
                instrument,
                zone,
                GeneratorTypes.keyRange
            );
            const { value, isClamped } = getReleaseTimecents(
                Math.floor((min + max) / 2),
                release
            );
            if (isClamped) {
                clamped++;
            }
            set(zone, GeneratorTypes.releaseVolEnv, value);
            const earlier = getEarlierDetune(zone);
            if (earlier === 0 && release.detune === 0) {
                continue;
            }
            if (release.detune !== 0 && isEnvelopeReplaced(instrument, zone)) {
                overwritten++;
            }
            const tuning =
                getPlayedGenerator(
                    instrument,
                    zone,
                    GeneratorTypes.coarseTune
                ) *
                    100 +
                getPlayedGenerator(instrument, zone, GeneratorTypes.fineTune) -
                earlier +
                release.detune;
            if (release.detune === 0) {
                for (const generator of MOD_ENVELOPE) {
                    set(zone, generator, null);
                }
            } else {
                for (const [generator, held] of HELD_ENVELOPE) {
                    set(zone, generator, held);
                }
                set(zone, GeneratorTypes.releaseModEnv, value);
                set(zone, GeneratorTypes.modEnvToPitch, -release.detune);
            }
            const coarse = Math.trunc(tuning / 100);
            setClamped(zone, GeneratorTypes.coarseTune, coarse);
            setClamped(zone, GeneratorTypes.fineTune, tuning - coarse * 100);
        }
    }
    return { actions, clamped, overwritten };
}
