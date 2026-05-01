import {
    type BasicMIDI,
    BasicSoundBank,
    midiMessageTypes,
    SoundBankLoader,
    SpessaSynthLogging,
    SpessaSynthProcessor,
    SpessaSynthSequencer
} from "spessasynth_core";
import { logInfo } from "../utils/core_utils.ts";
import {
    getSetting,
    type SavedSettingsType
} from "../settings/save_load/settings_typedef.ts";

// audio worklet processor operates at that
const BLOCK_SIZE = 128;
const MAX_CHUNKS_QUEUED = 16; // 16 * 128 = 2,048 // Windows does not like small buffer sizes
const MAX_RENDERED_AT_ONCE = 6;

const dummy = BasicSoundBank.getSampleSoundBankFile();

export class AudioEngine {
    context: AudioContext;

    processor: SpessaSynthProcessor;
    sequencer: SpessaSynthSequencer;
    analyser: AnalyserNode;
    intervalID = 0;

    targetNode: GainNode;

    audioChunksQueued = 0;

    readonly maxChunksQueued;
    private readonly currentSampleRate;

    private worklet: AudioWorkletNode | undefined;
    private processorTime = {
        taken: 0,
        time: 0
    };

    constructor(context: AudioContext, initialSettings: SavedSettingsType) {
        this.context = context;
        this.processor = new SpessaSynthProcessor(context.sampleRate, {
            enableEffects: true,
            initialTime: context.currentTime
        });
        this.maxChunksQueued = Math.min(
            Math.max(
                2,
                Math.round((context.sampleRate / 48_000) * MAX_CHUNKS_QUEUED)
            ),
            32
        );
        this.processor.soundBankManager.addSoundBank(
            SoundBankLoader.fromArrayBuffer(dummy.slice()),
            "main"
        );

        this.sequencer = new SpessaSynthSequencer(this.processor);
        this.sequencer.loopCount = Infinity;
        // analyser
        this.analyser = new AnalyserNode(this.context);
        this.analyser.connect(this.context.destination);
        this.targetNode = new GainNode(context);
        this.targetNode.connect(this.analyser);
        const isDev = import.meta.env.MODE === "development";
        if (isDev) {
            logInfo("Dev mode on");
        }
        SpessaSynthLogging(isDev, isDev, isDev);

        this.currentSampleRate = context.sampleRate;
        this.applySettings(initialSettings);
    }

    get MIDIPaused() {
        return this.sequencer.paused;
    }

    private get synthTime() {
        return (
            this.processorTime.time +
            (performance.now() - this.processorTime.taken) / 1000
        );
    }

    public processRealTime(msg: number[] | Uint8Array) {
        this.processor.processMessage(msg, 0, {
            time: this.synthTime
        });
    }

    public ccChangeRealTime(ch: number, cc: number, value: number) {
        this.processRealTime([
            midiMessageTypes.controllerChange | (ch % 16),
            cc,
            value
        ]);
    }

    public noteOffRealTime(ch: number, note: number) {
        this.processRealTime([midiMessageTypes.noteOff | (ch % 16), note]);
    }

    public noteOnRealTime(ch: number, note: number, velocity: number) {
        this.processRealTime([
            midiMessageTypes.noteOn | (ch % 16),
            note,
            velocity
        ]);
    }

    applySettings(settings: SavedSettingsType) {
        const processor = this.processor;
        this.setVolume(getSetting("volume", settings));
        processor.setMasterParameter(
            "interpolationType",
            getSetting("interpolation", settings)
        );
        processor.setMasterParameter(
            "reverbGain",
            getSetting("reverbLevel", settings)
        );
        processor.setMasterParameter(
            "chorusGain",
            getSetting("chorusLevel", settings)
        );
        processor.setMasterParameter(
            "delayGain",
            getSetting("delayLevel", settings)
        );
        processor.setMasterParameter(
            "voiceCap",
            getSetting("voiceCap", settings)
        );
        const rate = getSetting("sampleRate", settings);
        if (this.currentSampleRate !== rate) {
            const url = new URL(globalThis.location.href);
            url.searchParams.set("samplerate", rate.toString());
            globalThis.location.replace(url);
        }
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
        this.worklet.connect(this.targetNode);
        // Disable for performance

        this.worklet.port.onmessage = (e: MessageEvent<number>) =>
            (this.audioChunksQueued = e.data);

        this.intervalID = setInterval(this.audioLoop.bind(this));
    }

    audioLoop() {
        if (this.audioChunksQueued >= this.maxChunksQueued) {
            return;
        }
        const toRender = Math.min(
            MAX_RENDERED_AT_ONCE,
            this.maxChunksQueued - this.audioChunksQueued
        );
        const data: Float32Array[] = [];
        const transferList: ArrayBuffer[] = [];

        // encode the rendered data into a single f32array as it's faster
        for (let i = 0; i < toRender; i++) {
            const dataChunk = new Float32Array(BLOCK_SIZE * 2);
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

            // render!
            this.sequencer.processTick();
            this.processor.process(dL, dR);
            // copy out
            data.push(dataChunk);
            transferList.push(dataChunk.buffer);
        }
        this.processorTime.taken = performance.now();
        this.processorTime.time = this.processor.currentSynthTime;

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
