import {
    type BasicMIDI,
    BasicSoundBank,
    DEFAULT_SYNTH_MODE,
    MIDIMessageTypes,
    MIDIUtils,
    SoundBankLoader,
    SpessaLog,
    SpessaSynthProcessor,
    SpessaSynthSequencer,
    type SynthesizerEventCallback
} from "spessasynth_core";
import { KEYBOARD_TARGET_CHANNEL } from "../keyboard/target_channel.ts";
import { type SavedSettingsType } from "../settings/save_load/settings_typedef.ts";
import { logInfo } from "../utils/core_utils.ts";
import type { BankEntity } from "./bank_view.ts";
import { createPreviewPreset } from "./preview_preset.ts";
import { ListenerSet } from "./listener_set.ts";
import { EngineStatusStore } from "./engine_status.ts";

// audio worklet processor operates at that
const BLOCK_SIZE = 128;
const MAX_CHUNKS_QUEUED = 32; // 16 * 128 = 2,048 // Windows does not like small buffer sizes
const MAX_RENDERED_AT_ONCE = 2;
/**
 * Seconds of synth time between status updates, which caps the menu bar re-renders.
 */
const STATUS_INTERVAL = 0.1;

const dummy = BasicSoundBank.getSampleSoundBankFile();

export class AudioEngine {
    private readonly currentSampleRate;
    private worklet: AudioWorkletNode | undefined;
    private audioChunksQueued = 0;
    private readonly maxChunksQueued;
    private lastStatusTime = 0;
    public readonly context: AudioContext;
    public readonly processor: SpessaSynthProcessor;
    public readonly sequencer: SpessaSynthSequencer;
    public readonly analyser: AnalyserNode;
    public readonly targetNode: GainNode;
    /**
     * Every event of the synthesizer. Subscribe here instead of setting `processor.onEventCall`,
     * which only holds one callback.
     */
    public readonly synthEvents = new ListenerSet<SynthesizerEventCallback>();
    /**
     * Voice count and sequencer state, refreshed from the render loop.
     */
    public readonly status = new EngineStatusStore();

    constructor(context: AudioContext, initialSettings: SavedSettingsType) {
        this.context = context;
        this.processor = new SpessaSynthProcessor(context.sampleRate, {
            initialTime: context.currentTime
        });
        this.processor.onEventCall = (e) => this.synthEvents.emit(e);
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
        this.analyser = new AnalyserNode(this.context, { fftSize: 1024 });
        this.analyser.connect(this.context.destination);
        this.targetNode = new GainNode(context);
        this.targetNode.connect(this.analyser);
        const isDev = import.meta.env.MODE === "development";
        if (isDev) {
            logInfo("Dev mode on");
        }
        SpessaLog.setLogLevel(isDev, isDev, isDev);

        this.currentSampleRate = context.sampleRate;
        this.applySettings(initialSettings);
    }

    private audioLoop() {
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

        // send to worklet
        if (this.worklet) {
            this.worklet.port.postMessage(data, transferList);
        }
        if (
            this.processor.currentTime - this.lastStatusTime >=
            STATUS_INTERVAL
        ) {
            this.refreshStatus();
        }
    }

    private refreshStatus() {
        this.lastStatusTime = this.processor.currentTime;
        const song = this.sequencer.midiData;
        this.status.update({
            voiceCount: this.processor.voiceCount,
            time: Math.floor(this.sequencer.currentTime),
            duration: this.sequencer.duration,
            isPaused: this.sequencer.paused,
            hasSong: song !== undefined,
            songName: song?.getName()
        });
    }

    public processRealTime(msg: number[] | Uint8Array) {
        this.processor.processMessage(msg, 0);
    }

    public ccChangeRealTime(ch: number, cc: number, value: number) {
        this.processRealTime([
            MIDIMessageTypes.controllerChange | (ch % 16),
            cc,
            value
        ]);
    }

    public noteOffRealTime(ch: number, note: number) {
        this.processRealTime([MIDIMessageTypes.noteOff | (ch % 16), note]);
    }

    public noteOnRealTime(ch: number, note: number, velocity: number) {
        this.processRealTime([
            MIDIMessageTypes.noteOn | (ch % 16),
            note,
            velocity
        ]);
    }

    public applySettings(settings: SavedSettingsType) {
        const processor = this.processor;
        this.setVolume(settings.volume);
        processor.setSystemParameter(
            "interpolationType",
            settings.interpolation
        );

        processor.midiChannels[KEYBOARD_TARGET_CHANNEL].lockMIDIParameter(
            "velocitySenseDepth",
            false
        );
        processor.processMessages(
            MIDIUtils.setChannelMIDIParameter(
                0,
                KEYBOARD_TARGET_CHANNEL,
                DEFAULT_SYNTH_MODE,
                "velocitySenseDepth",
                settings.velocitySenseDepth
            )
        );
        processor.midiChannels[KEYBOARD_TARGET_CHANNEL].lockMIDIParameter(
            "velocitySenseDepth",
            true
        );

        processor.midiChannels[KEYBOARD_TARGET_CHANNEL].lockMIDIParameter(
            "velocitySenseOffset",
            false
        );
        processor.processMessages(
            MIDIUtils.setChannelMIDIParameter(
                0,
                KEYBOARD_TARGET_CHANNEL,
                DEFAULT_SYNTH_MODE,
                "velocitySenseOffset",
                settings.velocitySenseOffset
            )
        );
        processor.midiChannels[KEYBOARD_TARGET_CHANNEL].lockMIDIParameter(
            "velocitySenseOffset",
            true
        );

        processor.setSystemParameter("reverbGain", settings.reverbLevel);
        processor.setSystemParameter("chorusGain", settings.chorusLevel);
        processor.setSystemParameter("gsDelayGain", settings.delayLevel);

        processor.setSystemParameter("xgVariationGain", settings.delayLevel);

        processor.setSystemParameter("voiceCap", settings.voiceCap);
        const rate = settings.sampleRate;
        if (this.currentSampleRate === rate) {
            return;
        }
        const url = new URL(location.href);
        url.searchParams.set("samplerate", rate.toString());
        location.replace(url);
    }

    public async resumeContext() {
        await this.context.resume();
        logInfo("Setting up audio loop");
        await this.context.audioWorklet.addModule("./audio_worklet.js");
        this.worklet = new AudioWorkletNode(
            this.context,
            "playback-processor",
            {
                outputChannelCount: [2],
                numberOfOutputs: 1
            }
        );
        this.worklet.connect(this.targetNode);
        // Disable for performance

        this.worklet.port.onmessage = (e: MessageEvent<number>) => {
            this.audioChunksQueued = e.data;
            this.audioLoop();
        };
        this.audioLoop();
    }

    public setVolume(volume: number) {
        this.targetNode.gain.value = volume;
    }

    public toggleMIDI() {
        if (this.sequencer.paused) {
            this.sequencer.play();
        } else {
            this.sequencer.pause();
        }
        this.refreshStatus();
    }

    public playMIDI(mid: BasicMIDI) {
        this.sequencer.loadNewSongList([mid]);
        this.sequencer.play();
        this.refreshStatus();
    }

    public pauseMIDI() {
        this.sequencer.pause();
        this.refreshStatus();
    }

    /**
     * Jumps back a little, which plays the notes at that point again.
     */
    public rewindMIDI() {
        this.sequencer.currentTime -= 0.1;
        this.refreshStatus();
    }

    /**
     * Plays the element on the keyboard's channel, or the bank's first preset without one.
     */
    public setPreviewTarget(
        target: BankEntity | undefined,
        bank: BasicSoundBank
    ) {
        if (target) {
            this.processor.midiChannels[KEYBOARD_TARGET_CHANNEL].preset =
                createPreviewPreset(target, bank);
        } else if (bank.presets.length > 0) {
            this.processor.programChange(KEYBOARD_TARGET_CHANNEL, 0);
        }
        this.processor.clearCache();
    }
}
