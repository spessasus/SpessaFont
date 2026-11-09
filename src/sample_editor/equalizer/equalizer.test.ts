import { describe, expect, it } from "vitest";
import {
    applyEqualizer,
    EQ_FREQUENCIES,
    FLAT_EQUALIZER,
    getBandGains,
    getEqualizerResponse,
    isFlat,
    setEqualizerBand
} from "./equalizer.ts";

const RATE = 44_100;

function sine(frequency: number, length: number) {
    return Float32Array.from({ length }, (_, i) =>
        Math.sin((2 * Math.PI * frequency * i) / RATE)
    );
}

/**
 * The RMS of the second half, after the filters settled.
 */
function settledRms(data: Float32Array) {
    const half = data.subarray(data.length / 2);
    let sum = 0;
    for (const value of half) {
        sum += value * value;
    }
    return Math.sqrt(sum / half.length);
}

function withBand(index: number, gain: number) {
    return {
        ...FLAT_EQUALIZER,
        bands: FLAT_EQUALIZER.bands.with(index, gain)
    };
}

describe("equalizer", () => {
    it("leaves the audio alone when flat", () => {
        const data = sine(440, 1000);
        expect(isFlat(FLAT_EQUALIZER)).toBe(true);
        expect([...applyEqualizer(data, RATE, FLAT_EQUALIZER)]).toEqual([
            ...data
        ]);
    });

    it("boosts a band's frequency and leaves far ones almost alone", () => {
        const settings = withBand(5, 12);
        const atBand = sine(1000, 8820);
        const boosted = applyEqualizer(atBand, RATE, settings);
        const ratio = settledRms(boosted) / settledRms(atBand);
        expect(20 * Math.log10(ratio)).toBeCloseTo(12, 0);

        const far = sine(50, 8820);
        const farRatio =
            settledRms(applyEqualizer(far, RATE, settings)) / settledRms(far);
        expect(Math.abs(20 * Math.log10(farRatio))).toBeLessThan(0.5);
    });

    it("predicts the applied response", () => {
        const settings = { gain: -3, bands: [3, 0, -6, 0, 4, 0, 0, 8, 0, 2] };
        for (const frequency of [100, 700, 3500]) {
            const data = sine(frequency, 17_640);
            const ratio =
                settledRms(applyEqualizer(data, RATE, settings)) /
                settledRms(data);
            const [predicted] = getEqualizerResponse(settings, RATE, [
                frequency
            ]);
            expect(20 * Math.log10(ratio)).toBeCloseTo(predicted, 1);
        }
    });

    it("skips bands at or above the Nyquist frequency", () => {
        const settings = { gain: 0, bands: EQ_FREQUENCIES.map(() => 6) };
        const gains = getBandGains(settings, 16_000);
        expect(gains.slice(-2)).toEqual([0, 0]);
        expect(gains[7]).toBe(6);
    });
});

describe("setEqualizerBand", () => {
    it("sets one band and leaves the rest", () => {
        expect(setEqualizerBand(FLAT_EQUALIZER, 3, 3).bands).toEqual([
            0, 0, 0, 3, 0, 0, 0, 0, 0, 0
        ]);
    });

    it("clamps bands to 15 dB and the gain to 24 dB", () => {
        expect(setEqualizerBand(FLAT_EQUALIZER, 0, 20).bands[0]).toBe(15);
        expect(setEqualizerBand(FLAT_EQUALIZER, "gain", -30).gain).toBe(-24);
    });

    it("rounds to half a decibel", () => {
        expect(setEqualizerBand(FLAT_EQUALIZER, 8, -2.3).bands[8]).toBe(-2.5);
    });
});
