import {
    type BasicMIDI,
    BasicSoundBank,
    SoundBankLoader,
    SpessaSynthLogging,
    SpessaSynthProcessor,
    SpessaSynthSequencer
} from "spessasynth_core";
import { ChorusProcessor, ReverbProcessor } from "spessasynth_lib";
import { logInfo } from "../utils/core_utils.ts";

// audio worklet processor operates at that
const BLOCK_SIZE = 128;
const MAX_CHUNKS_QUEUED = 16; // 16 * 128 = 2,048 // Windows does not like small buffer sizes

type AudioChunk = [Float32Array, Float32Array];

const dummy = BasicSoundBank.getSampleSoundBankFile();

export class AudioEngine {
    context: AudioContext;

    processor: SpessaSynthProcessor;
    sequencer: SpessaSynthSequencer;
    analyser: AnalyserNode;
    chorus: ChorusProcessor;
    reverb: ReverbProcessor;
    intervalID = 0;

    targetNode: GainNode;

    audioChunksQueued = 0;

    private worklet: AudioWorkletNode | undefined;

    constructor(context: AudioContext) {
        this.context = context;
        this.processor = new SpessaSynthProcessor(context.sampleRate, {
            enableEffects: true,
            initialTime: context.currentTime
        });
        void dummy.then((d) =>
            this.processor.soundBankManager.addSoundBank(
                SoundBankLoader.fromArrayBuffer(d.slice()),
                "main"
            )
        );

        this.sequencer = new SpessaSynthSequencer(this.processor);
        this.sequencer.loopCount = Infinity;
        // analyser
        this.analyser = new AnalyserNode(this.context);
        this.analyser.connect(this.context.destination);
        this.targetNode = new GainNode(context);
        this.targetNode.connect(this.analyser);

        this.chorus = new ChorusProcessor(this.context);
        this.chorus.connect(this.targetNode);

        this.reverb = new ReverbProcessor(this.context);
        this.reverb.connect(this.targetNode);
        const isDev = import.meta.env.MODE === "development";
        if (isDev) {
            logInfo("Dev mode on");
        }
        SpessaSynthLogging(isDev, isDev, isDev);
    }

    get MIDIPaused() {
        return this.sequencer.paused;
    }

    async resumeContext() {
        await this.context.resume();
        clearInterval(this.intervalID);
        console.info("setting up audio loop");
        await this.context.audioWorklet.addModule("./audio_worklet.js");
        this.worklet = new AudioWorkletNode(
            this.context,
            "playback-processor",
            {
                outputChannelCount: [2, 2, 2],
                numberOfOutputs: 3
            }
        );
        this.worklet.connect(this.targetNode, 0);
        this.worklet.connect(this.reverb.input, 1);
        this.worklet.connect(this.chorus.input, 2);
        this.worklet.port.onmessage = (e: MessageEvent<number>) =>
            (this.audioChunksQueued = e.data);

        this.intervalID = setInterval(this.audioLoop.bind(this));
    }

    audioLoop() {
        if (this.audioChunksQueued >= MAX_CHUNKS_QUEUED) {
            return;
        }
        const toRender = MAX_CHUNKS_QUEUED - this.audioChunksQueued;
        const data: Float32Array[] = [];
        const transferList: ArrayBuffer[] = [];

        // encode the rendered data into a single f32array as it's faster
        for (let i = 0; i < toRender; i++) {
            const dataChunk = new Float32Array(BLOCK_SIZE * 6);
            let byteOffset = 0;
            // dry
            const dL = new Float32Array(
                dataChunk.buffer,
                byteOffset,
                BLOCK_SIZE
            );
            byteOffset += Float32Array.BYTES_PER_ELEMENT * BLOCK_SIZE;
            const dR = new Float32Array(
                dataChunk.buffer,
                byteOffset,
                BLOCK_SIZE
            );
            byteOffset += Float32Array.BYTES_PER_ELEMENT * BLOCK_SIZE;
            const d: AudioChunk = [dL, dR];

            // reverb
            const rL = new Float32Array(
                dataChunk.buffer,
                byteOffset,
                BLOCK_SIZE
            );
            byteOffset += Float32Array.BYTES_PER_ELEMENT * BLOCK_SIZE;
            const rR = new Float32Array(
                dataChunk.buffer,
                byteOffset,
                BLOCK_SIZE
            );
            byteOffset += Float32Array.BYTES_PER_ELEMENT * BLOCK_SIZE;
            const r: AudioChunk = [rL, rR];

            // chorus
            const cL = new Float32Array(
                dataChunk.buffer,
                byteOffset,
                BLOCK_SIZE
            );
            byteOffset += Float32Array.BYTES_PER_ELEMENT * BLOCK_SIZE;
            const cR = new Float32Array(
                dataChunk.buffer,
                byteOffset,
                BLOCK_SIZE
            );
            byteOffset += Float32Array.BYTES_PER_ELEMENT * BLOCK_SIZE;
            const c: AudioChunk = [cL, cR];

            // render!
            this.sequencer.processTick();
            this.processor.renderAudio(d, r, c);
            // copy out
            data.push(dataChunk);
            transferList.push(dataChunk.buffer);
        }

        // send to worklet
        if (this.worklet) {
            this.worklet.port.postMessage(data, transferList);
        }
    }

    setVolume(volume: number) {
        this.targetNode.gain.value = volume;
    }

    toggleMIDI() {
        if (this.sequencer.paused) {
            this.resumeMIDI();
        } else {
            this.pauseMIDI();
        }
    }

    playMIDI(mid: BasicMIDI) {
        this.sequencer.loadNewSongList([mid]);
        this.sequencer.play();
    }

    pauseMIDI() {
        this.sequencer.pause();
    }

    resumeMIDI() {
        this.sequencer.play();
    }
}
