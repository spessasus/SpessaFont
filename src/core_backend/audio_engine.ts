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
import { KeyboardChannelStore } from "./keyboard_channel_store.ts";
import type { SynthHost } from "./synth_binding.ts";

// audio worklet processor operates at that
const BLOCK_SIZE = 128;
const MAX_CHUNKS_QUEUED = 32; // 16 * 128 = 2,048 // Windows does not like small buffer sizes
const MAX_RENDERED_AT_ONCE = 2;
/**
 * Seconds of synth time between status updates, which caps the menu bar re-renders.
 */
const STATUS_INTERVAL = 0.1;

/**
 * The built-in bank the synthesizer plays when no tab's bank is attached.
 */
const SAMPLE_BANK_FILE = BasicSoundBank.getSampleSoundBankFile();

/**
 * A chain of audio nodes, from the first to the last.
 */
export interface OutputInsert {
    input: AudioNode;
    output: AudioNode;
}

export class AudioEngine implements SynthHost {
    private readonly currentSampleRate;
    private worklet: AudioWorkletNode | undefined;
    private audioChunksQueued = 0;
    private readonly maxChunksQueued;
    private lastStatusTime = 0;
    private outputInsert: OutputInsert | undefined;
    /**
     * What the keyboard's channel plays, kept to apply it again after a reset or refresh.
     */
    private previewTarget:
        { target: BankEntity | undefined; bank: BasicSoundBank } | undefined;
    private isPreviewStale = false;
    private started: Promise<void> | undefined;
    private isChannelRefreshQueued = false;
    private readonly processor: SpessaSynthProcessor;
    private readonly sequencer: SpessaSynthSequencer;
    public readonly context: AudioContext;
    public readonly analyser: AnalyserNode;
    /**
     * Where the synthesizer and the sample player connect. It goes to `targetNode`, through
     * the output insert when there is one.
     */
    public readonly inputNode: GainNode;
    public readonly targetNode: GainNode;
    /**
     * Every event of the synthesizer.
     */
    public readonly synthEvents = new ListenerSet<SynthesizerEventCallback>();
    /**
     * Voice count and sequencer state, refreshed from the render loop.
     */
    public readonly status = new EngineStatusStore();
    /**
     * The keyboard channel's controllers, pitch wheel and pressure, refreshed after synth events.
     */
    public readonly keyboardChannel = new KeyboardChannelStore();

    constructor(context: AudioContext, initialSettings: SavedSettingsType) {
        this.context = context;
        this.processor = new SpessaSynthProcessor(context.sampleRate, {
            initialTime: context.currentTime
        });
        this.processor.onEventCall = (e) => {
            // A reset (the reset button, a GS or GM reset message, a bank swap) puts the
            // keyboard's channel back on its MIDI patch. The event comes before the reset is
            // done, so the preview is applied again on the next render.
            if (e.type === "reset") {
                this.isPreviewStale = true;
            }
            this.synthEvents.emit(e);
            this.queueChannelRefresh();
        };
        this.maxChunksQueued = Math.min(
            Math.max(
                2,
                Math.round((context.sampleRate / 48_000) * MAX_CHUNKS_QUEUED)
            ),
            32
        );
        this.addSampleBank();
        this.refreshKeyboardChannel();

        this.sequencer = new SpessaSynthSequencer(this.processor);
        this.sequencer.loopCount = Infinity;
        // analyser
        this.analyser = new AnalyserNode(this.context, { fftSize: 1024 });
        this.analyser.connect(this.context.destination);
        this.targetNode = new GainNode(context);
        this.targetNode.connect(this.analyser);
        this.inputNode = new GainNode(context);
        this.inputNode.connect(this.targetNode);
        const isDev = import.meta.env.MODE === "development";
        if (isDev) {
            logInfo("Dev mode on");
        }
        SpessaLog.setLogLevel(isDev, isDev, isDev);

        this.currentSampleRate = context.sampleRate;
        this.applySettings(initialSettings);
    }

    private async start() {
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
        this.worklet.connect(this.inputNode);
        // Disable for performance

        this.worklet.port.onmessage = (e: MessageEvent<number>) => {
            this.audioChunksQueued = e.data;
            this.audioLoop();
        };
        this.audioLoop();
    }

    private addSampleBank() {
        this.processor.soundBankManager.addSoundBank(
            SoundBankLoader.fromArrayBuffer(SAMPLE_BANK_FILE.slice()),
            "main"
        );
    }

    /**
     * A render or a message can fire many events at once, so the channel is read once after them.
     */
    private queueChannelRefresh() {
        if (this.isChannelRefreshQueued) {
            return;
        }
        this.isChannelRefreshQueued = true;
        queueMicrotask(() => {
            this.isChannelRefreshQueued = false;
            this.refreshKeyboardChannel();
        });
    }

    private refreshKeyboardChannel() {
        const channel = this.processor.midiChannels[KEYBOARD_TARGET_CHANNEL];
        this.keyboardChannel.update({
            controllers: Array.from(channel.midiControllers),
            pitchWheel: channel.midiParameters.pitchWheel,
            pressure: channel.midiParameters.pressure
        });
    }

    private applyPreviewTarget() {
        this.isPreviewStale = false;
        if (!this.previewTarget) {
            return;
        }
        const { target, bank } = this.previewTarget;
        // Set directly, as a program change would follow the channel's bank select
        this.processor.midiChannels[KEYBOARD_TARGET_CHANNEL].preset = target
            ? createPreviewPreset(target, bank)
            : bank.presets[0];
        this.processor.clearCache();
    }

    private audioLoop() {
        // A playing song owns the keyboard's channel, pausing it brings the preview back
        if (this.isPreviewStale && this.sequencer.paused) {
            this.applyPreviewTarget();
        }
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

    /**
     * Resumes the context and starts the audio loop. Calling it again (StrictMode runs the
     * provider's effect twice) waits for the same start, so there is one worklet.
     */
    public resumeContext() {
        this.started ??= this.start();
        return this.started;
    }

    /**
     * Puts a chain of nodes between the sound sources and the volume, so it changes everything
     * that plays. Undefined takes it out. There is one at a time.
     */
    public setOutputInsert(insert: OutputInsert | undefined) {
        this.inputNode.disconnect();
        this.outputInsert?.output.disconnect(this.targetNode);
        this.outputInsert = insert;
        if (insert) {
            this.inputNode.connect(insert.input);
            insert.output.connect(this.targetNode);
        } else {
            this.inputNode.connect(this.targetNode);
        }
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
        // The song may have changed the keyboard channel's program
        this.applyPreviewTarget();
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
     * The target is kept, so it can be applied again after something resets the channel.
     */
    public setPreviewTarget(
        target: BankEntity | undefined,
        bank: BasicSoundBank
    ) {
        this.previewTarget = { target, bank };
        this.applyPreviewTarget();
    }

    /**
     * Releases every playing note, as if each key was let go.
     */
    public releaseAllNotes() {
        this.processor.stopAll(false);
    }

    /**
     * Cuts every note at once, the MIDI panic.
     */
    public stopAllNotes() {
        this.processor.stopAll(true);
    }

    /**
     * Cuts every note and puts every channel and system parameter back to its default.
     */
    public resetSynthesizer() {
        this.processor.stopAll(true);
        this.processor.reset();
    }

    public pitchWheel(channel: number, value: number) {
        this.processor.pitchWheel(channel, value);
    }

    public channelPressure(channel: number, value: number) {
        this.processor.channelPressure(channel, value);
    }

    public isBankAttached(bank: BasicSoundBank) {
        return (
            this.processor.soundBankManager.soundBankList[0]?.soundBank === bank
        );
    }

    /**
     * Channels keep the preset they resolved before, so the preset list is rebuilt after it.
     */
    public attachBank(bank: BasicSoundBank) {
        this.processor.soundBankManager.addSoundBank(bank, "main");
        this.refreshPresets();
    }

    public detachBank(bank: BasicSoundBank) {
        if (!this.isBankAttached(bank)) {
            return;
        }
        this.addSampleBank();
        this.refreshPresets();
    }

    public clearCache() {
        this.processor.clearCache();
    }

    /**
     * Rebuilds the synthesizer's preset list after the banks or their presets changed (added,
     * removed, renumbered, zones replaced). That points every channel at its MIDI patch again,
     * so the preview is applied again after it.
     */
    public refreshPresets() {
        this.processor.refreshPresets();
        this.applyPreviewTarget();
    }
}
