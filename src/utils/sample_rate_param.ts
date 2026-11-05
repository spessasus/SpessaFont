/**
 * The sample rates the settings accept. Browsers may accept less (Firefox about 8 to 192 kHz),
 * which `AudioEngineProvider` handles by falling back to the default rate.
 */
export const SAMPLE_RATE_LIMITS = { min: 3000, max: 768_000 } as const;

export const DEFAULT_SAMPLE_RATE = 48_000;

const SAMPLE_RATE_PARAM = "samplerate";

/**
 * The rate a sample rate change asked for with `?samplerate=`, if any. The parameter is taken
 * out of the address, so a later reload or a copied link does not change the rate again.
 */
export function takeSampleRateParam() {
    const url = new URL(location.href);
    const param = url.searchParams.get(SAMPLE_RATE_PARAM);
    if (param === null) {
        return undefined;
    }
    url.searchParams.delete(SAMPLE_RATE_PARAM);
    history.replaceState(history.state, "", url);
    const rate = Number.parseInt(param);
    return rate >= SAMPLE_RATE_LIMITS.min && rate <= SAMPLE_RATE_LIMITS.max
        ? rate
        : undefined;
}

/**
 * Reloads the page to run at a new sample rate, which an `AudioContext` cannot change.
 * The rate goes in the address and is saved only when the page starts again, so staying on
 * the page (the browser asks when banks have unsaved changes) keeps the settings as they were.
 */
export function reloadWithSampleRate(rate: number) {
    const url = new URL(location.href);
    url.searchParams.set(SAMPLE_RATE_PARAM, rate.toString());
    location.replace(url);
}
