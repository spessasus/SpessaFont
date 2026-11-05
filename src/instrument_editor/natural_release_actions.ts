import {
    type BasicInstrument,
    type BasicInstrumentZone,
    type GeneratorType,
    GeneratorTypes
} from "spessasynth_core";
import { SetGeneratorAction } from "../generator_table/cell/set_generator_action.ts";
import {
    clamp,
    getGeneratorRange
} from "../generator_table/generator_range.ts";
import { s2tc } from "../utils/conversion_helpers.ts";

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

/**
 * Whether the detune would overwrite the zone's own modulation envelope.
 */
export function hasModEnvelope(zone: BasicInstrumentZone) {
    return MOD_ENVELOPE.some((g) => zone.getGenerator(g, null) !== null);
}

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
 * 1), from the center of its key range. With a detune, the modulation envelope stays full while
 * the key is held and falls with the release, and the tuning is raised by the same amount it
 * takes away, so the pitch is right while held and glides by the detune on release.
 * `clamped` counts the zones whose release had to be clamped, `overwritten` the zones whose own
 * modulation envelope the detune replaced.
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
            value: number
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
        const getPlayed = (
            zone: BasicInstrumentZone,
            generator: GeneratorType
        ) =>
            zone.getGenerator(
                generator,
                instrument.globalZone.getGenerator(generator, 0)
            );
        for (const zone of instrument.zones) {
            const { min, max } =
                zone.keyRange.min === -1 ? { min: 0, max: 127 } : zone.keyRange;
            const { value, isClamped } = getReleaseTimecents(
                Math.floor((min + max) / 2),
                release
            );
            if (isClamped) {
                clamped++;
            }
            set(zone, GeneratorTypes.releaseVolEnv, value);
            if (release.detune === 0) {
                continue;
            }
            const earlier = getEarlierDetune(zone);
            if (earlier === 0 && hasModEnvelope(zone)) {
                overwritten++;
            }
            const tuning =
                getPlayed(zone, GeneratorTypes.coarseTune) * 100 +
                getPlayed(zone, GeneratorTypes.fineTune) -
                earlier +
                release.detune;
            for (const [generator, held] of HELD_ENVELOPE) {
                set(zone, generator, held);
            }
            set(zone, GeneratorTypes.releaseModEnv, value);
            set(zone, GeneratorTypes.modEnvToPitch, -release.detune);
            const coarse = Math.trunc(tuning / 100);
            set(zone, GeneratorTypes.coarseTune, coarse);
            set(zone, GeneratorTypes.fineTune, tuning - coarse * 100);
        }
    }
    return { actions, clamped, overwritten };
}
