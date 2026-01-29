import { encodeAudioBuffer } from "sl-web-ogg";

/**
 * Wrapper for any vorbis encoder
 * @param {Float32Array} data
 * @param {number} sampleRate
 * @returns {Promise<Uint8Array>}
 */
export async function encodeVorbis(
    data: Float32Array,
    sampleRate: number
): Promise<Uint8Array> {
    const chunks = await encodeAudioBuffer([data], sampleRate);
    const arr = new Uint8Array(chunks.reduce((l, c) => l + c.length, 0));
    let offset = 0;
    for (const c of chunks) {
        arr.set(c, offset);
        offset += c.length;
    }
    return arr;
}
