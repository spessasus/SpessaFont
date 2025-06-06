import {
    type MIDI,
    SpessaSynthLogging,
    SpessaSynthProcessor,
    SpessaSynthSequencer
} from "spessasynth_core";
import { FancyChorus, getReverbProcessor } from "spessasynth_lib";
import { logInfo } from "../utils/core_utils.ts";

// audio worklet processor operates at that
const BLOCK_SIZE = 128;
const CHUNK_COUNT = 16; // 16 * 128 = 2048
const MAX_CHUNKS_QUEUED = 10;

type AudioChunk = [Float32Array, Float32Array];
type AudioChunks = AudioChunk[];

export class AudioEngine {
    context: AudioContext;

    processor: SpessaSynthProcessor;
    sequencer: SpessaSynthSequencer;
    analyser: AnalyserNode;
    chorus: FancyChorus;
    reverb: ConvolverNode;
    intervalID = 0;

    audioChunksQueued: number = 0;

    private worklet: AudioWorkletNode | undefined;

    constructor(context: AudioContext) {
        this.context = context;
        this.processor = new SpessaSynthProcessor(context.sampleRate, {
            effectsEnabled: true,
            initialTime: context.currentTime
        });
        this.sequencer = new SpessaSynthSequencer(this.processor);
        this.sequencer.preservePlaybackState = true;
        // analyser
        this.analyser = new AnalyserNode(this.context);
        this.analyser.connect(this.context.destination);

        this.chorus = new FancyChorus(this.analyser);

        this.reverb = getReverbProcessor(context).conv;
        this.reverb.connect(this.analyser);
        const isDev = import.meta.env.MODE === "development";
        if (isDev) {
            logInfo("Dev mode on");
        }
        SpessaSynthLogging(isDev, isDev, isDev, isDev);
    }

    get MIDIPaused() {
        return this.sequencer.paused;
    }

    async resumeContext() {
        await this.context.resume();
        clearInterval(this.intervalID);
        console.log("setting up audio loop");
        await this.context.audioWorklet.addModule("./audio_worklet.js");
        this.worklet = new AudioWorkletNode(
            this.context,
            "playback-processor",
            {
                outputChannelCount: [2, 2, 2],
                numberOfOutputs: 3
            }
        );
        this.worklet.connect(this.analyser, 0);
        this.worklet.connect(this.reverb, 1);
        this.worklet.connect(this.chorus.input, 2);
        this.worklet.port.onmessage = (e) => (this.audioChunksQueued = e.data);

        this.intervalID = setInterval(this.audioLoop.bind(this));
    }

    audioLoop() {
        if (this.audioChunksQueued > MAX_CHUNKS_QUEUED) {
            return;
        }

        const dry: AudioChunks = [];
        const rev: AudioChunks = [];
        const chr: AudioChunks = [];

        for (let i = 0; i < CHUNK_COUNT; i++) {
            // clear data
            const d: AudioChunk = [
                new Float32Array(BLOCK_SIZE),
                new Float32Array(BLOCK_SIZE)
            ];
            const r: AudioChunk = [
                new Float32Array(BLOCK_SIZE),
                new Float32Array(BLOCK_SIZE)
            ];
            const c: AudioChunk = [
                new Float32Array(BLOCK_SIZE),
                new Float32Array(BLOCK_SIZE)
            ];

            // render!
            this.sequencer.processTick();
            this.processor.renderAudio(d, r, c);
            // copy out
            dry.push(d);
            chr.push(c);
            rev.push(r);
        }

        // send to worklet
        if (this.worklet) {
            this.worklet.port.postMessage([dry, rev, chr]);
        }
    }

    playMIDI(mid: MIDI) {
        this.sequencer.loadNewSongList([mid]);
    }

    pauseMIDI() {
        this.sequencer.pause();
    }

    resumeMIDI() {
        this.sequencer.play();
    }
}
