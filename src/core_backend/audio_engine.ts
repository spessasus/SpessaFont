import { MIDIMessageTypes } from "spessasynth_core";
import { type SavedSettingsType } from "../settings/save_load/settings_typedef.ts";
import { logInfo } from "../utils/core_utils.ts";
import type { HostSettings } from "../synth_host/protocol.ts";
import playbackWorkletURL from "../synth_host/playback_worklet.ts?worker&url";
import { SynthClient } from "./synth_client.ts";
import { startHost } from "./start_host.ts";

/**
 * Blocks of 128 frames the playback worklet keeps queued at 48 kHz (about 85 ms), as before the
 * Worker. A smaller queue should work now, but it has to be measured per browser on an idle
 * machine first (`AUDIO_WORKLET_MIGRATION_PLAN.md`, phase 5).
 */
const QUEUED_BLOCKS = 32;

/**
 * A chain of audio nodes, from the first to the last.
 */
export interface OutputInsert {
    input: AudioNode;
    output: AudioNode;
}

export function getHostSettings(settings: SavedSettingsType): HostSettings {
    return {
        interpolation: settings.interpolation,
        velocitySenseDepth: settings.velocitySenseDepth,
        velocitySenseOffset: settings.velocitySenseOffset,
        reverbLevel: settings.reverbLevel,
        chorusLevel: settings.chorusLevel,
        delayLevel: settings.delayLevel,
        voiceCap: settings.voiceCap
    };
}

/**
 * The editor's audio: the Web Audio graph on this thread, and the synthesizer host, which it
 * talks to only through `client`.
 */
export class AudioEngine {
    private readonly currentSampleRate;
    private worklet: AudioWorkletNode | undefined;
    private outputInsert: OutputInsert | undefined;
    private started: Promise<void> | undefined;
    public readonly context: AudioContext;
    public readonly analyser: AnalyserNode;
    /**
     * Where the synthesizer and the sample player connect. It goes to `targetNode`, through
     * the output insert when there is one.
     */
    public readonly inputNode: GainNode;
    public readonly targetNode: GainNode;
    /**
     * The synthesizer host, which also keeps every open bank's mirror.
     */
    public readonly client: SynthClient;
    /**
     * Where the host runs, once it started: a Worker, or this thread when the Worker failed.
     */
    public readonly hostMode;

    constructor(context: AudioContext, initialSettings: SavedSettingsType) {
        this.context = context;
        const isDev = import.meta.env.MODE === "development";
        if (isDev) {
            logInfo("Dev mode on");
        }
        const { port, mode } = startHost({
            sampleRate: context.sampleRate,
            queuedBlocks: QUEUED_BLOCKS,
            currentTime: context.currentTime,
            settings: getHostSettings(initialSettings),
            isVerbose: isDev
        });
        this.client = new SynthClient(port);
        this.hostMode = mode;
        this.analyser = new AnalyserNode(this.context, { fftSize: 1024 });
        this.analyser.connect(this.context.destination);
        this.targetNode = new GainNode(context);
        this.targetNode.connect(this.analyser);
        this.inputNode = new GainNode(context);
        this.inputNode.connect(this.targetNode);

        this.currentSampleRate = context.sampleRate;
        this.applySettings(initialSettings);
    }

    private async start() {
        await this.context.resume();
        logInfo("Setting up audio loop");
        await this.context.audioWorklet.addModule(playbackWorkletURL);
        this.worklet = new AudioWorkletNode(
            this.context,
            "playback-processor",
            {
                outputChannelCount: [2],
                numberOfOutputs: 1
            }
        );
        this.worklet.connect(this.inputNode);
        // The host sends the rendered audio straight to the worklet
        const output = new MessageChannel();
        this.worklet.port.postMessage(output.port1, [output.port1]);
        this.client.send({ type: "connectOutput", port: output.port2 }, [
            output.port2
        ]);
    }

    /**
     * Every note on, note off, stop all and reset event of the synthesizer.
     */
    public get synthEvents() {
        return this.client.synthEvents;
    }

    /**
     * Voice count and sequencer state.
     */
    public get status() {
        return this.client.status;
    }

    /**
     * The keyboard channel's controllers, pitch wheel and pressure.
     */
    public get keyboardChannel() {
        return this.client.keyboardChannel;
    }

    public processRealTime(msg: number[] | Uint8Array) {
        this.client.midi(msg);
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
        this.setVolume(settings.volume);
        this.client.applySettings(getHostSettings(settings));
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
        this.client.send({ type: "toggle" });
    }

    /**
     * Plays a MIDI file, which the host parses again. The buffer moves to the host.
     */
    public playMIDI(file: ArrayBuffer, name: string) {
        this.client.send({ type: "loadSong", file, name }, [file]);
    }

    public pauseMIDI() {
        this.client.send({ type: "pause" });
    }

    /**
     * Jumps back a little, which plays the notes at that point again.
     */
    public rewindMIDI() {
        this.client.send({ type: "seekBy", seconds: -0.1 });
    }

    /**
     * Releases every playing note, as if each key was let go.
     */
    public releaseAllNotes() {
        this.client.send({ type: "stopAll", force: false });
    }

    /**
     * Cuts every note at once, the MIDI panic.
     */
    public stopAllNotes() {
        this.client.send({ type: "stopAll", force: true });
    }

    /**
     * Cuts every note and puts every channel and system parameter back to its default.
     */
    public resetSynthesizer() {
        this.client.send({ type: "reset" });
    }

    public pitchWheel(channel: number, value: number) {
        this.client.send({ type: "pitchWheel", channel, value });
    }

    public channelPressure(channel: number, value: number) {
        this.client.send({ type: "channelPressure", channel, value });
    }
}
