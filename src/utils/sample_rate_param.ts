export function readSampleRateParam() {
    const params = new URLSearchParams(globalThis.location.search);
    const rate = params.get("samplerate");
    if (rate) {
        return Number.parseInt(rate) || 48_000;
    }
    return 48_000;
}
