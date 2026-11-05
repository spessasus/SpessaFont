import {
    BasicMIDI,
    type BasicSample,
    BasicSoundBank,
    DEFAULT_SYNTH_MODE,
    MIDIUtils,
    type SampleStoredData,
    SoundBankLoader,
    SpessaLog,
    SpessaSynthProcessor,
    SpessaSynthSequencer
} from "spessasynth_core";
import { KEYBOARD_TARGET_CHANNEL } from "../keyboard/target_channel.ts";
import { createPreviewPreset } from "../core_backend/preview_preset.ts";
import { isElementDiffEmpty } from "../core_backend/view_diff.ts";
import { logError } from "../utils/core_utils.ts";
import {
    BankMirror,
    copyStoredData,
    type MirrorTarget,
    type SampleCopySource
} from "./bank_mirror.ts";
import type {
    ConversionReport,
    ForwardedSynthEvent,
    HostCommand,
    HostEvent,
    HostPort,
    HostRequest,
    HostSettings,
    PatchMessage,
    SampleState,
    WriteOptions,
    WriteResult
} from "./protocol.ts";
import type { KeyboardChannelValues } from "../core_backend/keyboard_channel_store.ts";
import type { PlaybackReport } from "./playback_worklet.ts";

// The playback worklet plays blocks of this size
const BLOCK_SIZE = 128;
const MAX_RENDERED_AT_ONCE = 2;
/**
 * Seconds of synth time between status updates, which caps the menu bar re-renders.
 */
const STATUS_INTERVAL = 0.1;

const SAMPLE_BANK_FILE = BasicSoundBank.getSampleSoundBankFile();

const FORWARDED_EVENTS = new Set<string>([
    "noteOn",
    "noteOff",
    "stopAll",
    "reset"
]);

export interface SynthHostOptions {
    sampleRate: number;
    /**
     * How many blocks the playback worklet keeps queued at 48 kHz, which sets the latency.
     * Scaled with the sample rate.
     */
    queuedBlocks: number;
    /**
     * The audio context's time, so the synthesizer's clock starts where it is.
     */
    currentTime: number;
    settings: HostSettings;
    /**
     * Logs the synthesizer's info and warnings, as the dev build does.
     */
    isVerbose: boolean;
}

function isForwarded(event: { type: string }): event is ForwardedSynthEvent {
    return FORWARDED_EVENTS.has(event.type);
}

function captureState(sample: BasicSample): SampleState {
    return {
        sampleRate: sample.sampleRate,
        loopStart: sample.loopStart,
        loopEnd: sample.loopEnd,
        form: sample.storedForm ?? "s16le",
        length: sample.sampleLength
    };
}

function isSameState(a: SampleState, b: SampleState) {
    return (
        a.sampleRate === b.sampleRate &&
        a.loopStart === b.loopStart &&
        a.loopEnd === b.loopEnd &&
        a.form === b.form &&
        a.length === b.length
    );
}

/**
 * Owns the synthesizer, the sequencer and one mirror per open bank, and is driven only through
 * messages on its port. Nothing here touches the DOM, so it runs the same in a Worker or on the
 * main thread behind a MessageChannel.
 */
export class SynthHost {
    private readonly port: HostPort;
    private output: MessagePort | undefined;
    private chunksQueued = 0;
    private underruns = 0;
    private readonly maxChunksQueued: number;
    private lastStatusTime = 0;
    private lastChannel: KeyboardChannelValues | undefined;
    private readonly mirrors = new Map<number, BankMirror>();
    private attachedSession: number | undefined;
    /**
     * What the keyboard's channel plays, kept to apply it again after a reset or refresh.
     */
    private previewTarget:
        { sessionId: number; target: MirrorTarget | undefined } | undefined;
    private isPreviewStale = false;
    private pendingEvents = new Array<ForwardedSynthEvent>();
    private isFlushQueued = false;
    /**
     * The sample data before and after each conversion, for its undo and redo.
     */
    /**
     * The data of the copied samples, by their ids, for pasting.
     */
    private clipboardData = new Map<number, SampleStoredData>();

    private readonly snapshots = new Map<
        number,
        Map<number, SampleStoredData>
    >();
    private nextSnapshot = 1;
    public readonly processor: SpessaSynthProcessor;
    public readonly sequencer: SpessaSynthSequencer;

    public constructor(port: HostPort, options: SynthHostOptions) {
        this.port = port;
        SpessaLog.setLogLevel(
            options.isVerbose,
            options.isVerbose,
            options.isVerbose
        );
        this.processor = new SpessaSynthProcessor(options.sampleRate, {
            initialTime: options.currentTime
        });
        this.processor.onEventCall = (e) => {
            // A reset (the reset button, a GS or GM reset message, a bank swap) puts the
            // keyboard's channel back on its MIDI patch. The event comes before the reset is
            // done, so the preview is applied again on the next render.
            if (e.type === "reset") {
                this.isPreviewStale = true;
            }
            if (isForwarded(e)) {
                this.pendingEvents.push(e);
            }
            this.queueFlush();
        };
        this.maxChunksQueued = Math.min(
            Math.max(
                2,
                Math.round((options.sampleRate / 48_000) * options.queuedBlocks)
            ),
            64
        );
        this.addSampleBank();
        this.sequencer = new SpessaSynthSequencer(this.processor);
        this.sequencer.loopCount = Infinity;
        this.applySettings(options.settings);
        this.port.onmessage = (e: MessageEvent<HostCommand>) => {
            this.handle(e.data);
        };
        this.flush();
    }

    private send(event: HostEvent, transfer: Transferable[] = []) {
        this.port.postMessage(event, transfer);
    }

    private addSampleBank() {
        this.processor.soundBankManager.addSoundBank(
            SoundBankLoader.fromArrayBuffer(SAMPLE_BANK_FILE.slice()),
            "main"
        );
    }

    /**
     * A render or a message can fire many events at once, so they go out together after them,
     * with the keyboard channel's values if those changed.
     */
    private queueFlush() {
        if (this.isFlushQueued) {
            return;
        }
        this.isFlushQueued = true;
        queueMicrotask(() => this.flush());
    }

    private flush() {
        this.isFlushQueued = false;
        if (this.pendingEvents.length > 0) {
            this.send({ type: "events", events: this.pendingEvents });
            this.pendingEvents = [];
        }
        const channel = this.processor.midiChannels[KEYBOARD_TARGET_CHANNEL];
        const values: KeyboardChannelValues = {
            controllers: Array.from(channel.midiControllers),
            pitchWheel: channel.midiParameters.pitchWheel,
            pressure: channel.midiParameters.pressure
        };
        const last = this.lastChannel;
        const isSame =
            last?.pitchWheel === values.pitchWheel &&
            last.pressure === values.pressure &&
            last.controllers.every((v, i) => v === values.controllers[i]);
        if (isSame) {
            return;
        }
        this.lastChannel = values;
        this.send({ type: "keyboardChannel", values });
    }

    /**
     * Sent about 10 times a second while rendering. The editor's store skips unchanged ones.
     */
    private refreshStatus() {
        this.lastStatusTime = this.processor.currentTime;
        const song = this.sequencer.midiData;
        this.send({
            type: "status",
            status: {
                voiceCount: this.processor.voiceCount,
                time: Math.floor(this.sequencer.currentTime),
                duration: this.sequencer.duration,
                isPaused: this.sequencer.paused,
                hasSong: song !== undefined,
                songName: song?.getName(),
                underruns: this.underruns
            }
        });
    }

    private applyPreviewTarget() {
        this.isPreviewStale = false;
        const preview = this.previewTarget;
        const mirror = preview
            ? this.mirrors.get(preview.sessionId)
            : undefined;
        if (!preview || !mirror) {
            return;
        }
        const element = preview.target
            ? mirror.resolve(preview.target)
            : undefined;
        // Set directly, as a program change would follow the channel's bank select
        this.processor.midiChannels[KEYBOARD_TARGET_CHANNEL].preset = element
            ? createPreviewPreset(element, mirror.bank)
            : mirror.bank.presets[0];
        this.processor.clearCache();
    }

    /**
     * Rebuilds the preset list after the banks or their presets changed. That points every
     * channel at its MIDI patch again, so the preview is applied again after it.
     */
    private refreshPresets() {
        this.processor.refreshPresets();
        this.applyPreviewTarget();
    }

    private render() {
        // A playing song owns the keyboard's channel, pausing it brings the preview back
        if (this.isPreviewStale && this.sequencer.paused) {
            this.applyPreviewTarget();
        }
        const output = this.output;
        if (!output || this.chunksQueued >= this.maxChunksQueued) {
            return;
        }
        const toRender = Math.min(
            MAX_RENDERED_AT_ONCE,
            this.maxChunksQueued - this.chunksQueued
        );
        const data = new Array<Float32Array>();
        const transfer = new Array<ArrayBuffer>();
        // Both channels in one array, which is faster to send
        for (let i = 0; i < toRender; i++) {
            const chunk = new Float32Array(BLOCK_SIZE * 2);
            this.sequencer.processTick();
            this.processor.process(
                chunk.subarray(0, BLOCK_SIZE),
                chunk.subarray(BLOCK_SIZE)
            );
            data.push(chunk);
            transfer.push(chunk.buffer);
        }
        output.postMessage(data, transfer);
        if (
            this.processor.currentTime - this.lastStatusTime >=
            STATUS_INTERVAL
        ) {
            this.refreshStatus();
        }
    }

    private applySettings(settings: HostSettings) {
        const processor = this.processor;
        processor.setSystemParameter(
            "interpolationType",
            settings.interpolation
        );
        const channel = processor.midiChannels[KEYBOARD_TARGET_CHANNEL];
        for (const parameter of [
            "velocitySenseDepth",
            "velocitySenseOffset"
        ] as const) {
            channel.lockMIDIParameter(parameter, false);
            processor.processMessages(
                MIDIUtils.setChannelMIDIParameter(
                    0,
                    KEYBOARD_TARGET_CHANNEL,
                    DEFAULT_SYNTH_MODE,
                    parameter,
                    settings[parameter]
                )
            );
            channel.lockMIDIParameter(parameter, true);
        }
        processor.setSystemParameter("reverbGain", settings.reverbLevel);
        processor.setSystemParameter("chorusGain", settings.chorusLevel);
        processor.setSystemParameter("gsDelayGain", settings.delayLevel);
        processor.setSystemParameter("xgVariationGain", settings.delayLevel);
        processor.setSystemParameter("voiceCap", settings.voiceCap);
    }

    private getMirror(sessionId: number) {
        const mirror = this.mirrors.get(sessionId);
        if (!mirror) {
            throw new Error(`No bank is open for session ${sessionId}.`);
        }
        return mirror;
    }

    private getSample(sessionId: number, id: number) {
        const sample = this.getMirror(sessionId).getSample(id);
        if (!sample) {
            throw new Error(
                `Session ${sessionId} has no sample with the id ${id}.`
            );
        }
        return sample;
    }

    private applyPatch(sessionId: number, patch: PatchMessage) {
        const mirror = this.getMirror(sessionId);
        const sampleData = new Map(patch.sampleData);
        for (const [id, snapshotId] of patch.sampleRestores) {
            const stored = this.snapshots.get(snapshotId)?.get(id);
            if (!stored) {
                throw new Error(`Snapshot ${snapshotId} has no sample ${id}.`);
            }
            // Shared with the snapshot, which nothing changes in place
            sampleData.set(id, stored);
        }
        const sampleCopies = new Map<number, SampleCopySource>();
        for (const [id, ref] of patch.sampleCopies) {
            const data =
                ref.from === "clipboard"
                    ? this.clipboardData.get(ref.id)
                    : this.getSample(ref.sessionId, ref.id).getStoredData();
            if (!data) {
                throw new Error(`The clipboard has no sample ${ref.id}.`);
            }
            sampleCopies.set(id, { data });
        }
        mirror.apply({
            views: patch.views,
            info: patch.info,
            sampleData,
            sampleCopies
        });
        const { views } = patch;
        // Core's preset list keeps each preset's zone array from when it was built
        if (
            this.attachedSession === sessionId &&
            !isElementDiffEmpty(views.presets)
        ) {
            this.refreshPresets();
            return;
        }
        const isChanged =
            !isElementDiffEmpty(views.presets) ||
            !isElementDiffEmpty(views.instruments) ||
            !isElementDiffEmpty(views.samples) ||
            views.defaultModulators !== undefined;
        if (isChanged) {
            this.processor.clearCache();
        }
    }

    private attach(sessionId: number) {
        this.processor.soundBankManager.addSoundBank(
            this.getMirror(sessionId).bank,
            "main"
        );
        this.attachedSession = sessionId;
        // Channels keep the preset they resolved before, so they are pointed at the new bank's
        this.refreshPresets();
    }

    private closeBank(sessionId: number) {
        const mirror = this.mirrors.get(sessionId);
        if (!mirror) {
            return;
        }
        if (this.attachedSession === sessionId) {
            this.attachedSession = undefined;
            this.addSampleBank();
            this.refreshPresets();
        }
        this.mirrors.delete(sessionId);
        mirror.bank.destroySoundBank();
    }

    private takeSnapshot(mirror: BankMirror, ids: Iterable<number>) {
        const snapshot = new Map<number, SampleStoredData>();
        for (const id of ids) {
            const sample = mirror.getSample(id);
            if (sample?.hasData) {
                snapshot.set(id, sample.getStoredData());
            }
        }
        const id = this.nextSnapshot++;
        this.snapshots.set(id, snapshot);
        return id;
    }

    /**
     * Converts (for an explicit SF2 or SF3 save) and writes the mirror's bank. A conversion
     * changes the samples in place, so their data from before and after is kept as snapshots.
     */
    private async write(
        sessionId: number,
        options: WriteOptions,
        requestId: number
    ): Promise<WriteResult> {
        const mirror = this.getMirror(sessionId);
        const { bank } = mirror;
        const progressFunction = (value: number) =>
            this.send({ type: "progress", requestId, value });
        let conversion: ConversionReport | undefined;
        if (options.convert) {
            const before = new Map(
                bank.samples.map((s) => [
                    s,
                    { stored: s.getStoredData(), state: captureState(s) }
                ])
            );
            const versionBefore = { ...bank.soundBankInfo.version };
            let failure: string | undefined;
            try {
                await this.convert(bank, options.convert, progressFunction);
            } catch (error) {
                logError("Failed to convert the samples.", error);
                failure =
                    error instanceof Error ? error.message : String(error);
            }
            const samples = new Array<ConversionReport["samples"][number]>();
            const beforeData = new Map<number, SampleStoredData>();
            for (const [sample, old] of before) {
                const after = captureState(sample);
                if (
                    sample.getStoredData().data === old.stored.data &&
                    isSameState(after, old.state)
                ) {
                    continue;
                }
                const id = mirror.getSampleId(sample);
                samples.push({ id, before: old.state, after });
                beforeData.set(id, old.stored);
            }
            const versionAfter = { ...bank.soundBankInfo.version };
            const isVersionChanged =
                versionAfter.major !== versionBefore.major ||
                versionAfter.minor !== versionBefore.minor;
            if (isVersionChanged || samples.length > 0) {
                const beforeSnapshot = this.nextSnapshot++;
                this.snapshots.set(beforeSnapshot, beforeData);
                conversion = {
                    samples,
                    beforeSnapshot,
                    afterSnapshot: this.takeSnapshot(
                        mirror,
                        samples.map((s) => s.id)
                    ),
                    versionBefore,
                    versionAfter
                };
            }
            if (failure !== undefined) {
                return { binary: undefined, conversion, error: failure };
            }
        }
        const writeOptions = { progressFunction, software: options.software };
        let binary: ArrayBuffer;
        switch (options.format) {
            case "sf2":
            case "sf3": {
                // An SF2 write keeps compressed samples compressed, which preserves SF3 on "auto"
                binary = bank.writeSF2(writeOptions);
                break;
            }

            case "sf4": {
                binary = bank.writeSFE(writeOptions);
                break;
            }

            case "dls": {
                binary = bank.writeDLS(writeOptions);
            }
        }
        return { binary, conversion, error: undefined };
    }

    private async convert(
        bank: BasicSoundBank,
        format: "pcm" | "compressed",
        progressFunction: (value: number) => void
    ) {
        if (format === "pcm") {
            await bank.setSampleFormat({ format: "pcm", progressFunction });
            return;
        }
        // The encoder is only needed here, so it loads on the first SF3 save
        const { encodeVorbis } =
            await import("../core_backend/encode_vorbis.ts");
        await bank.setSampleFormat({
            format: "compressed",
            compressionFunction: encodeVorbis,
            progressFunction
        });
    }

    private async answer(request: HostRequest) {
        switch (request.type) {
            case "readAudio": {
                return this.getSample(
                    request.sessionId,
                    request.id
                ).getAudioData();
            }

            case "readStoredData": {
                return this.getSample(
                    request.sessionId,
                    request.id
                ).getStoredData();
            }

            case "write": {
                return this.write(
                    request.sessionId,
                    request.options,
                    request.requestId
                );
            }
        }
    }

    private async handleRequest(request: HostRequest) {
        try {
            const value = await this.answer(request);
            // A written file is not needed here afterward, so it moves instead of being copied
            const transfer =
                value && "binary" in value && value.binary
                    ? [value.binary]
                    : [];
            this.send(
                { type: "answer", requestId: request.requestId, value },
                transfer
            );
        } catch (error) {
            logError(`The host failed to answer ${request.type}.`, error);
            this.send({
                type: "failure",
                requestId: request.requestId,
                message: error instanceof Error ? error.message : String(error)
            });
        }
    }

    private handleCommand(command: HostCommand) {
        switch (command.type) {
            case "readAudio":
            case "readStoredData":
            case "write": {
                void this.handleRequest(command);
                return;
            }

            case "connectOutput": {
                this.output = command.port;
                this.output.onmessage = (e: MessageEvent<PlaybackReport>) => {
                    this.chunksQueued = e.data.queued;
                    this.underruns = e.data.underruns;
                    this.render();
                };
                this.render();
                return;
            }

            case "midi": {
                this.processor.processMessage(command.data, 0);
                return;
            }

            case "pitchWheel": {
                this.processor.pitchWheel(command.channel, command.value);
                return;
            }

            case "channelPressure": {
                this.processor.channelPressure(command.channel, command.value);
                return;
            }

            case "stopAll": {
                this.processor.stopAll(command.force);
                return;
            }

            case "reset": {
                this.processor.stopAll(true);
                this.processor.reset();
                return;
            }

            case "settings": {
                this.applySettings(command.settings);
                return;
            }

            case "loadSong": {
                this.sequencer.loadNewSongList([
                    BasicMIDI.fromArrayBuffer(command.file, command.name)
                ]);
                this.sequencer.play();
                break;
            }

            case "play": {
                this.sequencer.play();
                break;
            }

            case "pause": {
                this.sequencer.pause();
                // The song may have changed the keyboard channel's program
                this.applyPreviewTarget();
                break;
            }

            case "toggle": {
                if (this.sequencer.paused) {
                    this.sequencer.play();
                } else {
                    this.sequencer.pause();
                }
                break;
            }

            case "seekBy": {
                this.sequencer.currentTime += command.seconds;
                break;
            }

            case "openBank": {
                this.mirrors.set(
                    command.sessionId,
                    BankMirror.fromFile(command.file, command.ids)
                );
                return;
            }

            case "patch": {
                this.applyPatch(command.sessionId, command.patch);
                return;
            }

            case "closeBank": {
                this.closeBank(command.sessionId);
                return;
            }

            case "copyToClipboard": {
                const mirror = this.getMirror(command.sessionId);
                // Copied, as a conversion changes the mirror's data in place
                this.clipboardData = new Map(
                    command.ids.map((id) => {
                        const sample = mirror.getSample(id);
                        if (!sample) {
                            throw new Error(`No sample ${id} to copy.`);
                        }
                        return [id, copyStoredData(sample.getStoredData())];
                    })
                );
                return;
            }

            case "attach": {
                this.attach(command.sessionId);
                return;
            }

            case "previewTarget": {
                this.previewTarget = {
                    sessionId: command.sessionId,
                    target: command.target
                };
                this.applyPreviewTarget();
                return;
            }
        }
        // The song commands change what the menu bar shows
        this.refreshStatus();
    }

    private handle(command: HostCommand) {
        try {
            this.handleCommand(command);
        } catch (error) {
            logError(`The host failed to run ${command.type}.`, error);
        }
    }

    /**
     * The mirror of a session, for tests that look at what the synthesizer plays.
     */
    public getMirrorOf(sessionId: number) {
        return this.getMirror(sessionId);
    }
}
