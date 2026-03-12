/**
 * @typedef {[Float32Array, Float32Array]} AudioChunk
 * @typedef {AudioChunk[]} AudioChunks
 */

/**
 * An AudioWorkletProcessor that plays a stream of audio.
 */
class PlaybackProcessor extends AudioWorkletProcessor {
    /**
     * @type {Float32Array[]}
     */
    data = [];

    constructor() {
        super();

        this.port.onmessage = (e) => {
            const data = e.data;
            this.data.push(...data);
        };
    }

    process(_inputs, outputs) {
        const blockSize = outputs[0][0].length;

        const data = this.data.shift();
        if (!data) {
            return true;
        }

        // decode the data
        outputs[0][0].set(data.subarray(0, blockSize));
        outputs[0][1].set(data.subarray(blockSize, blockSize * 2));
        this.port.postMessage(this.data.length);
        return true;
    }
}

console.info("Registered JS processor");
registerProcessor("playback-processor", PlaybackProcessor);
