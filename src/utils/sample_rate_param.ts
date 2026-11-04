/**
 * The sample rates the settings accept. Browsers may accept less (Firefox about 8 to 192 kHz),
 * which `AudioEngineProvider` handles by falling back to the default rate.
 */
export const SAMPLE_RATE_LIMITS = { min: 3000, max: 768_000 } as const;

const DEFAULT_SAMPLE_RATE = 48_000;

/**
 * The `?samplerate=` of the page, used as the default when nothing is saved.
 */
export function readSampleRateParam() {
    const params = new URLSearchParams(location.search);
    const rate = Number.parseInt(params.get("samplerate") ?? "");
    return rate >= SAMPLE_RATE_LIMITS.min && rate <= SAMPLE_RATE_LIMITS.max
        ? rate
        : DEFAULT_SAMPLE_RATE;
}
