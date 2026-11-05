import { describe, expect, it } from "vitest";
import { GeneratorTypes } from "spessasynth_core";
import { getGeneratorRange } from "./generator_range.ts";

/**
 * The preset ranges SpessaFont took from core 4.4.7, which removed them. The editor keeps them.
 */
const CORE_4_4_7_PRESET_RANGES = [
    [GeneratorTypes.modLfoToPitch, -24_000, 24_000],
    [GeneratorTypes.vibLfoToPitch, -24_000, 24_000],
    [GeneratorTypes.modEnvToPitch, -24_000, 24_000],
    [GeneratorTypes.initialFilterFc, -21_000, 21_000],
    [GeneratorTypes.initialFilterQ, -960, 960],
    [GeneratorTypes.modLfoToFilterFc, -24_000, 24_000],
    [GeneratorTypes.modEnvToFilterFc, -24_000, 24_000],
    [GeneratorTypes.modLfoToVolume, -1920, 1920],
    [GeneratorTypes.chorusEffectsSend, -1000, 1000],
    [GeneratorTypes.reverbEffectsSend, -1000, 1000],
    [GeneratorTypes.pan, -1000, 1000],
    [GeneratorTypes.delayModLFO, -21_000, 21_000],
    [GeneratorTypes.freqModLFO, -21_000, 21_000],
    [GeneratorTypes.delayVibLFO, -21_000, 21_000],
    [GeneratorTypes.freqVibLFO, -21_000, 21_000],
    [GeneratorTypes.delayModEnv, -21_000, 21_000],
    [GeneratorTypes.attackModEnv, -21_000, 21_000],
    [GeneratorTypes.holdModEnv, -21_000, 21_000],
    [GeneratorTypes.decayModEnv, -21_000, 21_000],
    [GeneratorTypes.sustainModEnv, -1000, 1000],
    [GeneratorTypes.releaseModEnv, -21_000, 21_000],
    [GeneratorTypes.keyNumToModEnvHold, -2400, 2400],
    [GeneratorTypes.keyNumToModEnvDecay, -2400, 2400],
    [GeneratorTypes.delayVolEnv, -21_000, 21_000],
    [GeneratorTypes.attackVolEnv, -21_000, 21_000],
    [GeneratorTypes.holdVolEnv, -21_000, 21_000],
    [GeneratorTypes.decayVolEnv, -21_000, 21_000],
    [GeneratorTypes.sustainVolEnv, -1440, 1440],
    [GeneratorTypes.releaseVolEnv, -21_000, 21_000],
    [GeneratorTypes.keyNumToVolEnvHold, -2400, 2400],
    [GeneratorTypes.keyNumToVolEnvDecay, -2400, 2400],
    [GeneratorTypes.initialAttenuation, -1440, 1440],
    [GeneratorTypes.coarseTune, -240, 240],
    [GeneratorTypes.fineTune, -198, 198],
    [GeneratorTypes.scaleTuning, -1200, 1200]
] as const;

describe("getGeneratorRange", () => {
    it.each(CORE_4_4_7_PRESET_RANGES)(
        "keeps the preset range of generator %i",
        (generator, min, max) => {
            expect(getGeneratorRange(generator, false)).toEqual({ min, max });
        }
    );

    it("lets a preset move other generators by the instrument range's span", () => {
        // 0 to 127 in an instrument
        expect(getGeneratorRange(GeneratorTypes.keyNum, false)).toEqual({
            min: -128,
            max: 128
        });
    });

    it("keeps every range within 16 bits", () => {
        expect(getGeneratorRange(GeneratorTypes.exclusiveClass, true).max).toBe(
            32_767
        );
        expect(getGeneratorRange(GeneratorTypes.delayModEnv, true).min).toBe(
            -32_768
        );
    });
});
