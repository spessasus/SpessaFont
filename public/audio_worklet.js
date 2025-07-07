/**
 * @typedef {[Float32Array, Float32Array]} AudioChunk
 * @typedef {AudioChunk[]} AudioChunks
 */

/**
 * An AudioWorkletProcessor that plays back three separate streams of stereo audio: dry, reverb, and chorus.
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
        let offset = 0;
        for (let i = 0; i < 3; i++) {
            outputs[i][0].set(data.subarray(offset, offset + blockSize));
            offset += blockSize;
            outputs[i][1].set(data.subarray(offset, offset + blockSize));
            offset += blockSize;
        }
        this.port.postMessage(this.data.length);
        return true;
    }
}

console.log("Registered JS processor");
registerProcessor("playback-processor", PlaybackProcessor);
