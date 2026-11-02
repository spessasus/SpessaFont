import { createEncoder, type WasmMediaEncoder } from "wasm-media-encoders";
import oggWasmURL from "wasm-media-encoders/wasm/ogg.wasm?url";

/**
 * libvorbis VBR quality, from -1 to 10. 5 is what the old sl-web-ogg encoder used (0.5).
 */
const VORBIS_QUALITY = 5;
/**
 * Samples fed to the encoder at once.
 */
const ENCODE_CHUNK_SIZE = 65_536;

// Compiling the WASM module is slow, so one encoder is reconfigured for every sample
const cache: { encoder?: Promise<WasmMediaEncoder<"audio/ogg">> } = {};

async function getEncoder() {
    cache.encoder ??= createEncoder("audio/ogg", oggWasmURL);
    try {
        return await cache.encoder;
    } catch (error) {
        // Let the next save try again, for example after the connection comes back
        cache.encoder = undefined;
        throw error;
    }
}

/**
 * Downloads the encoder so the service worker caches it and SF3 saves work offline.
 */
export async function prefetchVorbisEncoder() {
    await fetch(oggWasmURL);
}

/**
 * Encodes a mono sample as Ogg Vorbis.
 * @param data the sample data
 * @param sampleRate the sample rate in Hz
 */
export async function encodeVorbis(data: Float32Array, sampleRate: number) {
    const encoder = await getEncoder();
    // Nothing below awaits, so two samples never share the encoder at the same time
    encoder.configure({
        channels: 1,
        sampleRate,
        vbrQuality: VORBIS_QUALITY
    });
    const parts = new Array<Uint8Array>();
    for (let i = 0; i < data.length; i += ENCODE_CHUNK_SIZE) {
        // The returned buffer belongs to the encoder and is overwritten by the next call
        parts.push(
            encoder.encode([data.subarray(i, i + ENCODE_CHUNK_SIZE)]).slice()
        );
    }
    parts.push(encoder.finalize().slice());

    const out = new Uint8Array(parts.reduce((l, p) => l + p.length, 0));
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
}
