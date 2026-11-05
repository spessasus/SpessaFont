/**
 * The band centers of the graphic equalizer, in Hz, the same ten as Polyphone.
 */
export const EQ_FREQUENCIES = [
    32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16_000
] as const;
export const EQ_MAX_BAND_GAIN = 15;
export const EQ_MAX_GAIN = 24;
/**
 * One octave wide bands, so neighbors overlap a bit and the curve stays smooth.
 */
export const EQ_Q = Math.SQRT2;

export interface EqualizerSettings {
    /**
     * The overall gain in dB.
     */
    readonly gain: number;
    /**
     * The gain of each band in `EQ_FREQUENCIES`, in dB.
     */
    readonly bands: readonly number[];
}

/**
 * The equalizer of the sample editor. It is kept by the bank editor, so the same settings can
 * be applied to several samples in turn.
 */
export interface EqualizerState {
    readonly settings: EqualizerSettings;
    /**
     * Everything plays through the equalizer, the sample player and the keyboard.
     */
    readonly isPreviewing: boolean;
}

export const FLAT_EQUALIZER: EqualizerSettings = {
    gain: 0,
    bands: EQ_FREQUENCIES.map(() => 0)
};

export const DEFAULT_EQUALIZER_STATE: EqualizerState = {
    settings: FLAT_EQUALIZER,
    isPreviewing: false
};

export function isFlat(settings: EqualizerSettings) {
    return settings.gain === 0 && settings.bands.every((gain) => gain === 0);
}

export function dbToGain(db: number) {
    return Math.pow(10, db / 20);
}

/**
 * The gain of each band at this sample rate. Bands at or above the Nyquist frequency have
 * nothing to change, so they get 0.
 */
export function getBandGains(settings: EqualizerSettings, sampleRate: number) {
    return EQ_FREQUENCIES.map((frequency, i) =>
        frequency < sampleRate / 2 ? (settings.bands[i] ?? 0) : 0
    );
}

interface BiquadCoefficients {
    b0: number;
    b1: number;
    b2: number;
    a1: number;
    a2: number;
}

/**
 * A peaking filter from the Audio EQ Cookbook, the same one Web Audio's `BiquadFilterNode`
 * uses, so the preview sounds like the applied result.
 */
function getPeakingCoefficients(
    frequency: number,
    gain: number,
    sampleRate: number
): BiquadCoefficients {
    const a = Math.pow(10, gain / 40);
    const w0 = (2 * Math.PI * frequency) / sampleRate;
    const alpha = Math.sin(w0) / (2 * EQ_Q);
    const cos = Math.cos(w0);
    const a0 = 1 + alpha / a;
    return {
        b0: (1 + alpha * a) / a0,
        b1: (-2 * cos) / a0,
        b2: (1 - alpha * a) / a0,
        a1: (-2 * cos) / a0,
        a2: (1 - alpha / a) / a0
    };
}

/**
 * Runs the audio through every band and the gain. Returns new audio of the same length.
 */
export function applyEqualizer(
    data: Float32Array,
    sampleRate: number,
    settings: EqualizerSettings
) {
    // Float64 so ten filters in a row do not add rounding noise
    const out = Float64Array.from(data);
    for (const [i, gain] of getBandGains(settings, sampleRate).entries()) {
        if (gain === 0) {
            continue;
        }
        const { b0, b1, b2, a1, a2 } = getPeakingCoefficients(
            EQ_FREQUENCIES[i],
            gain,
            sampleRate
        );
        // Transposed direct form II
        let z1 = 0;
        let z2 = 0;
        for (let s = 0; s < out.length; s++) {
            const x = out[s];
            const y = b0 * x + z1;
            z1 = b1 * x - a1 * y + z2;
            z2 = b2 * x - a2 * y;
            out[s] = y;
        }
    }
    const gain = dbToGain(settings.gain);
    return Float32Array.from(out, (value) => value * gain);
}

/**
 * The response of the equalizer in dB at each of the given frequencies.
 */
export function getEqualizerResponse(
    settings: EqualizerSettings,
    sampleRate: number,
    frequencies: readonly number[]
) {
    const filters = getBandGains(settings, sampleRate).flatMap((gain, i) =>
        gain === 0
            ? []
            : [getPeakingCoefficients(EQ_FREQUENCIES[i], gain, sampleRate)]
    );
    return frequencies.map((frequency) => {
        const w = (2 * Math.PI * frequency) / sampleRate;
        const cos1 = Math.cos(w);
        const sin1 = Math.sin(w);
        const cos2 = Math.cos(2 * w);
        const sin2 = Math.sin(2 * w);
        let db = settings.gain;
        for (const { b0, b1, b2, a1, a2 } of filters) {
            // |H(e^jw)| with e^-jw = cos - j sin
            const numRe = b0 + b1 * cos1 + b2 * cos2;
            const numIm = -(b1 * sin1 + b2 * sin2);
            const denRe = 1 + a1 * cos1 + a2 * cos2;
            const denIm = -(a1 * sin1 + a2 * sin2);
            db +=
                10 *
                Math.log10(
                    (numRe * numRe + numIm * numIm) /
                        (denRe * denRe + denIm * denIm)
                );
        }
        return db;
    });
}
