export function readSampleRateParam() {
    const params = new URLSearchParams(location.search);
    const rate = params.get("samplerate");
    return rate ? Number.parseInt(rate) || 48_000 : 48_000;
}
