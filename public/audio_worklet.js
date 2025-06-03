/**
 * @typedef {[Float32Array, Float32Array]} AudioChunk
 * @typedef {AudioChunk[]} AudioChunks
 */

/**
 * An AudioWorkletProcessor that plays back three separate streams of stereo audio: dry, reverb, and chorus.
 */
class PlaybackProcessor extends AudioWorkletProcessor {
    constructor() {
        super();

        /** @type {AudioChunks} */
        this.dryData = [];

        /** @type {AudioChunks} */
        this.revData = [];

        /** @type {AudioChunks} */
        this.chrData = [];

        this.port.onmessage = (e) => {
            /** @type {[AudioChunks, AudioChunks, AudioChunks]} */
            const data = e.data;
            this.dryData.push(...data[0]);
            this.revData.push(...data[1]);
            this.chrData.push(...data[2]);
        };
    }

    process(_inputs, outputs) {
        const outDry = outputs[0];
        const outRev = outputs[1];
        const outChr = outputs[2];

        const dry = this.dryData.shift();
        const rev = this.revData.shift();
        const chr = this.chrData.shift();

        if (dry) {
            outDry[0].set(dry[0]);
            outDry[1].set(dry[1]);
        }

        if (rev) {
            outRev[0].set(rev[0]);
            outRev[1].set(rev[1]);
        }

        if (chr) {
            outChr[0].set(chr[0]);
            outChr[1].set(chr[1]);
        }
        return true;
    }
}

console.log("Registered JS processor");
registerProcessor("playback-processor", PlaybackProcessor);
