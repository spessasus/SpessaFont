import {
    BasicMIDI,
    type BasicSample,
    BasicSoundBank,
    DEFAULT_SYNTH_MODE,
    MIDIUtils,
    type SampleEncodingFunction,
    type SampleStoredData,
    type SF2VersionTag,
    SoundBankLoader,
    type SoundBankWriteOptions,
    SpessaLog,
    type SoundBankManagerListEntry,
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
    type MirrorIds,
    shareOwnStoredData,
    type MirrorTarget,
    type SampleCopySource
} from "./bank_mirror.ts";
import type {
    ConversionReport,
    ForwardedSynthEvent,
    HandoffEvent,
    HostCommand,
    HostEvent,
    HostHandoff,
    HostPort,
    HostRequest,
    HostSettings,
    PatchMessage,
    SampleState,
    WriteOptions,
    WriteResult
} from "./protocol.ts";
import { getHandoffTransfer } from "./protocol.ts";
import type { KeyboardChannelValues } from "../core_backend/keyboard_channel_store.ts";
import type { WriteFormat } from "../core_backend/persistence.ts";
import type { PlaybackReport } from "./playback_worklet.ts";
import { getErrorMessage } from "../error_boundary/error_message.ts";

// The playback worklet plays blocks of this size
const BLOCK_SIZE = 128;
const MAX_RENDERED_AT_ONCE = 2;
/**
 * The decoded audio the synthesizer keeps for the samples it played, in bytes. Older samples
 * decode again when they play, so a song over a large bank does not keep a float copy of all
 * of it.
 */
const DECODED_SAMPLE_BUDGET = 512 * 1024 * 1024;
/**
 * The id of the open bank in core's sound bank list. The only other entry is a song's
 * embedded bank.
 */
const MAIN_BANK = "main";
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
    /**
     * What the host on the other thread kept, when this host takes over from it.
     */
    handoff?: HostHandoff;
}

function isForwarded(event: { type: string }): event is ForwardedSynthEvent {
    return FORWARDED_EVENTS.has(event.type);
}

function captureState(sample: BasicSample) {
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

function isSameVersion(a: SF2VersionTag, b: SF2VersionTag) {
    return a.major === b.major && a.minor === b.minor;
}

function writeBank(
    bank: BasicSoundBank,
    format: WriteFormat,
    options: Partial<SoundBankWriteOptions>
) {
    switch (format) {
        case "sf2":
        case "sf3": {
            // An SF2 write keeps compressed samples compressed, which preserves SF3 on "auto"
            return bank.writeSF2(options);
        }

        case "sf4": {
            return bank.writeSFE(options);
        }

        case "dls": {
            return bank.writeDLS(options);
        }
    }
}

/**
 * A sample's data and state when a write started.
 */
interface StartState {
    readonly stored: SampleStoredData | undefined;
    readonly state: SampleState;
}

/**
 * Owns the synthesizer, the sequencer and one mirror per open bank, and is driven only through
 * messages on its port. Nothing here touches the DOM, so it runs the same in a Worker or on the
 * main thread behind a MessageChannel.
 */
export class SynthHost {
    private readonly port: HostPort;
    private output: MessagePort | undefined;
    /**
     * Blocks sent to the playback worklet since it connected. With the count it played, this
     * gives the blocks still queued or on their way, which a report sent before the last
     * chunks arrived cannot tell.
     */
    private chunksSent = 0;
    private chunksPlayed = 0;
    private underruns = 0;
    /**
     * Set while rendering fails, so the failure is reported once and not for every block.
     */
    private isRenderFailing = false;
    private readonly maxChunksQueued: number;
    private settings: HostSettings;
    /**
     * The playing song's file, kept to hand it to another host.
     */
    private song: { file: ArrayBuffer; name: string } | undefined;
    /**
     * Requests still being answered, which a handoff waits for.
     */
    private readonly running = new Set<Promise<void>>();
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
    /**
     * A paused song's embedded bank, taken out of the synthesizer so the keyboard and MIDI
     * input play the edited bank. It comes back when the song plays again.
     */
    private pausedEmbeddedBank: SoundBankManagerListEntry | undefined;
    /**
     * Sessions whose mirror failed to open. Their patches are dropped quietly, since the
     * failed open was reported already.
     */
    private readonly failedSessions = new Set<number>();
    private pendingEvents = new Array<ForwardedSynthEvent>();
    private isFlushQueued = false;
    /**
     * The data of the copied samples, by their ids, for pasting.
     */
    private clipboardData = new Map<number, SampleStoredData>();

    /**
     * The sample data before and after each conversion, for its undo and redo, by session and
     * snapshot id. They go with the session.
     */
    private readonly snapshots = new Map<
        number,
        Map<number, ReadonlyMap<number, SampleStoredData>>
    >();
    private nextSnapshot = 1;
    /**
     * The messages for sessions whose bank is being written, run in order once it is done. A
     * session that copies from such a bank shares its queue until then.
     */
    private readonly heldCommands = new Map<number, HostCommand[]>();
    /**
     * The queue a copy to the clipboard waits in, which pastes from the clipboard wait behind.
     */
    private clipboardHold: HostCommand[] | undefined;
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
            initialTime: options.handoff?.currentTime ?? options.currentTime,
            decodedSampleBudget: DECODED_SAMPLE_BUDGET
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
        // The same time at every rate, the queue holds 1 KB per block
        this.maxChunksQueued = Math.max(
            2,
            Math.round((options.sampleRate / 48_000) * options.queuedBlocks)
        );
        this.processor.soundBankManager.addSoundBank(
            SoundBankLoader.fromArrayBuffer(SAMPLE_BANK_FILE.slice()),
            MAIN_BANK
        );
        this.sequencer = new SpessaSynthSequencer(this.processor);
        this.sequencer.loopCount = Infinity;
        this.settings = options.handoff?.settings ?? options.settings;
        this.applySettings(this.settings);
        if (options.handoff) {
            this.takeOver(options.handoff);
        }
        this.port.onmessage = (e: MessageEvent<HostCommand>) => {
            this.handle(e.data);
        };
        this.flush();
    }

    private send(event: HostEvent, transfer: Transferable[] = []) {
        this.port.postMessage(event, transfer);
    }

    /**
     * Bank changes never reset the synthesizer, which would put a playing song's volumes, pans
     * and pitch bend ranges back to their defaults. The preview is applied again after them.
     */
    private setMainBank(bank: BasicSoundBank) {
        this.processor.soundBankManager.addSoundBank(bank, MAIN_BANK, 0, false);
        this.applyPreviewTarget();
    }

    /**
     * A playing song owns the keyboard's channel. Playing points every channel at its MIDI
     * patch again, which gives the channel back to the song when it was paused.
     */
    private playSong() {
        this.sequencer.play();
        const embedded = this.pausedEmbeddedBank;
        this.pausedEmbeddedBank = undefined;
        const manager = this.processor.soundBankManager;
        if (embedded) {
            // Back in front, where the sequencer put it, as core's addSoundBank appends and the
            // first bank wins a patch both have
            manager.soundBankList = [embedded, ...manager.soundBankList];
        }
        this.refreshPresets();
    }

    /**
     * Pausing (by any command, or a song that ended) brings the preview back and takes the
     * song's embedded bank out.
     */
    private pauseSong() {
        this.sequencer.pause();
        const manager = this.processor.soundBankManager;
        const embedded = manager.soundBankList.find(
            (entry) => entry.id !== MAIN_BANK
        );
        if (embedded) {
            this.pausedEmbeddedBank = embedded;
            manager.deleteSoundBank(embedded.id, false);
        }
        this.applyPreviewTarget();
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
        // A playing song owns the keyboard's channel, pausing it brings the preview back
        if (!this.sequencer.paused) {
            this.isPreviewStale = true;
            return;
        }
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
            : mirror.bank.presets.at(0);
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
        // A reset, or a song that ended, while the preview waited
        if (this.isPreviewStale && this.sequencer.paused) {
            this.pauseSong();
        }
        const output = this.output;
        const inFlight = this.chunksSent - this.chunksPlayed;
        if (!output || inFlight >= this.maxChunksQueued) {
            return;
        }
        const toRender = Math.min(
            MAX_RENDERED_AT_ONCE,
            this.maxChunksQueued - inFlight
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
        this.chunksSent += toRender;
        if (
            this.processor.currentTime - this.lastStatusTime >=
            STATUS_INTERVAL
        ) {
            this.refreshStatus();
        }
    }

    private applySettings(settings: HostSettings) {
        this.settings = settings;
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
        if (this.failedSessions.has(sessionId)) {
            return;
        }
        const mirror = this.getMirror(sessionId);
        const sampleData = new Map(patch.sampleData);
        for (const [id, snapshotId] of patch.sampleRestores) {
            const stored = this.snapshots
                .get(sessionId)
                ?.get(snapshotId)
                ?.get(id);
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
        const { bank } = this.getMirror(sessionId);
        this.attachedSession = sessionId;
        // Channels keep the preset they resolved before, so they are pointed at the new bank's
        this.setMainBank(bank);
    }

    private closeBank(sessionId: number) {
        this.failedSessions.delete(sessionId);
        const mirror = this.mirrors.get(sessionId);
        if (!mirror) {
            return;
        }
        // The keyboard plays the sample bank again, nothing keeps the closed bank's elements
        if (this.previewTarget?.sessionId === sessionId) {
            this.previewTarget = undefined;
        }
        if (this.attachedSession === sessionId) {
            this.attachedSession = undefined;
            this.setMainBank(
                SoundBankLoader.fromArrayBuffer(SAMPLE_BANK_FILE.slice())
            );
        }
        this.mirrors.delete(sessionId);
        this.snapshots.delete(sessionId);
        mirror.bank.destroySoundBank();
    }

    private openBank(sessionId: number, file: ArrayBuffer, ids: MirrorIds) {
        try {
            this.mirrors.set(sessionId, BankMirror.fromFile(file, ids));
        } catch (error) {
            this.failedSessions.add(sessionId);
            throw error;
        }
    }

    private addSnapshot(
        sessionId: number,
        data: ReadonlyMap<number, SampleStoredData>
    ) {
        let snapshots = this.snapshots.get(sessionId);
        if (!snapshots) {
            snapshots = new Map();
            this.snapshots.set(sessionId, snapshots);
        }
        const id = this.nextSnapshot++;
        snapshots.set(id, data);
        return id;
    }

    /**
     * Converts (for an explicit SF2 or SF3 save) and writes the mirror's bank.
     *
     * The editor stays usable during a save, so while a bank is written every message for it
     * (patches, reads, copies, closing it, another write) waits and runs afterward, in order.
     * The conversion and the file see the bank as it was when the save started. After writing,
     * the converted samples get their old data back, and the report says what changed. The
     * editor records it only for samples nothing changed during the save, and its patch gives
     * them the converted data from the snapshot. So the mirror only ever changes through the
     * editor's patches, and the samples the editor leaves out stay as they are in both.
     */
    private async write(
        sessionId: number,
        options: WriteOptions,
        requestId: number
    ): Promise<WriteResult> {
        const mirror = this.getMirror(sessionId);
        this.heldCommands.set(sessionId, []);
        try {
            return await this.convertAndWrite(
                sessionId,
                mirror,
                options,
                requestId
            );
        } finally {
            const held = this.heldCommands.get(sessionId) ?? [];
            for (const [id, queue] of this.heldCommands) {
                if (queue === held) {
                    this.heldCommands.delete(id);
                }
            }
            if (this.clipboardHold === held) {
                this.clipboardHold = undefined;
            }
            for (const command of held) {
                this.handle(command);
            }
            // A held patch may have added the element the keyboard was set to play
            if (this.previewTarget?.sessionId === sessionId) {
                this.applyPreviewTarget();
            }
        }
    }

    private async convertAndWrite(
        sessionId: number,
        mirror: BankMirror,
        options: WriteOptions,
        requestId: number
    ): Promise<WriteResult> {
        const { bank } = mirror;
        const progressFunction = (value: number) =>
            this.send({ type: "progress", requestId, value });
        const failed = (
            error: unknown,
            failure?: WriteResult["failure"]
        ): WriteResult => ({
            binary: undefined,
            conversion: undefined,
            error: getErrorMessage(error),
            failure,
            hasCompressedSamples: false
        });

        // Loaded before anything changes, so a missing encoder gets its own message
        let compressionFunction: SampleEncodingFunction | undefined;
        if (options.convert === "compressed") {
            try {
                const { encodeVorbis, loadVorbisEncoder } =
                    await import("../core_backend/encode_vorbis.ts");
                await loadVorbisEncoder();
                compressionFunction = encodeVorbis;
            } catch (error) {
                logError("Failed to load the Vorbis encoder.", error);
                return failed(error, "encoderUnavailable");
            }
        }

        const start = new Map<BasicSample, StartState>();
        for (const sample of bank.samples) {
            const stored = sample.hasData ? sample.getStoredData() : undefined;
            start.set(sample, { stored, state: captureState(sample) });
        }
        const versionBefore = { ...bank.soundBankInfo.version };
        const getChanged = () =>
            [...start].filter(
                ([sample, old]) =>
                    old.stored !== undefined &&
                    (sample.getStoredData().data !== old.stored.data ||
                        !isSameState(captureState(sample), old.state))
            );
        const restore = (changed: [BasicSample, StartState][]) => {
            for (const [sample, old] of changed) {
                if (old.stored) {
                    sample.setStoredData(old.stored);
                }
                sample.sampleRate = old.state.sampleRate;
                sample.loopStart = old.state.loopStart;
                sample.loopEnd = old.state.loopEnd;
            }
            bank.soundBankInfo.version = versionBefore;
        };

        let binary: ArrayBuffer;
        try {
            if (options.convert === "pcm") {
                await bank.setSampleFormat({ format: "pcm", progressFunction });
            } else if (compressionFunction) {
                // Otherwise a sample that fails stays PCM and the bank saves as SF3 anyway
                await bank.setSampleFormat({
                    format: "compressed",
                    compressionFunction,
                    progressFunction,
                    rejectOnFailure: true
                });
            }
            const isClosing = this.heldCommands
                .get(sessionId)
                ?.some(
                    (c) => c.type === "closeBank" && c.sessionId === sessionId
                );
            if (isClosing) {
                throw new Error("The bank was closed.");
            }
            binary = writeBank(bank, options.format, {
                progressFunction,
                software: options.software
            });
        } catch (error) {
            logError("Failed to write the sound bank.", error);
            restore(getChanged());
            return failed(error);
        }

        const changed = getChanged();
        const versionAfter = { ...bank.soundBankInfo.version };
        let conversion: ConversionReport | undefined;
        if (changed.length > 0 || !isSameVersion(versionBefore, versionAfter)) {
            const getId = (sample: BasicSample) => mirror.getSampleId(sample);
            conversion = {
                samples: changed.map(([sample, old]) => ({
                    id: getId(sample),
                    before: old.state,
                    after: captureState(sample)
                })),
                beforeSnapshot: this.addSnapshot(
                    sessionId,
                    new Map(
                        changed.flatMap(([sample, old]) =>
                            old.stored ? [[getId(sample), old.stored]] : []
                        )
                    )
                ),
                afterSnapshot: this.addSnapshot(
                    sessionId,
                    new Map(
                        changed.map(([sample]) => [
                            getId(sample),
                            sample.getStoredData()
                        ])
                    )
                ),
                versionBefore,
                versionAfter
            };
        }
        const hasCompressedSamples = bank.samples.some((s) => s.isCompressed);
        restore(changed);
        return {
            binary,
            conversion,
            error: undefined,
            failure: undefined,
            hasCompressedSamples
        };
    }

    private async answer(request: HostRequest) {
        switch (request.type) {
            case "readAudio": {
                const sample = this.getSample(request.sessionId, request.id);
                // A copy, as the decoded data may be what the synthesizer plays, or a view
                // into the file
                const wasDecoded = sample.isDecoded;
                const audio = sample.getAudioData().slice();
                // The editor reads every sample it shows, the Worker should not keep them all
                // decoded. One the synthesizer decoded stays.
                if (!wasDecoded) {
                    sample.releaseDecoded();
                }
                return audio;
            }

            case "readStoredData": {
                const sample = this.getSample(request.sessionId, request.id);
                // Only the sample's own bytes: data loaded from a file is a view into all of it
                const wasDecoded = sample.isDecoded;
                const stored = copyStoredData(sample.getStoredData());
                // A DLS sample decodes to give its stored data
                if (!wasDecoded) {
                    sample.releaseDecoded();
                }
                return stored;
            }

            case "openBank": {
                this.openBank(request.sessionId, request.file, request.ids);
                return undefined;
            }

            case "readSampleLengths": {
                return request.ids.map(
                    (id) => this.getSample(request.sessionId, id).sampleLength
                );
            }

            case "write": {
                return this.write(
                    request.sessionId,
                    request.options,
                    request.requestId
                );
            }

            case "loadSong": {
                // A request, so a broken file is reported without parsing it on the page too.
                // The new song brings its own embedded bank, or none
                this.pausedEmbeddedBank = undefined;
                const file = request.file.slice(0);
                this.sequencer.loadNewSongList([
                    BasicMIDI.fromArrayBuffer(request.file, request.name)
                ]);
                this.song = { file, name: request.name };
                this.playSong();
                this.refreshStatus();
                return undefined;
            }
        }
    }

    private async handleRequest(request: HostRequest) {
        try {
            const value = await this.answer(request);
            // Answers are copies made for the editor (a written file is not needed here
            // afterward), so they move instead of being copied again
            const transfer = new Array<Transferable>();
            if (value instanceof Float32Array) {
                transfer.push(value.buffer);
            } else if (value && "binary" in value && value.binary) {
                transfer.push(value.binary);
            } else if (value && "form" in value) {
                transfer.push(value.data.buffer);
            }
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

    /**
     * Answers a request, kept in `running` until it is answered, which a handoff waits for.
     */
    private async runRequest(request: HostRequest) {
        const answered = this.handleRequest(request);
        this.running.add(answered);
        await answered;
        this.running.delete(answered);
    }

    private handleCommand(command: HostCommand) {
        switch (command.type) {
            case "readAudio":
            case "readStoredData":
            case "openBank":
            case "readSampleLengths":
            case "write":
            case "loadSong": {
                void this.runRequest(command);
                return;
            }

            case "handOff": {
                void this.handOff();
                return;
            }

            case "connectOutput": {
                this.output = command.port;
                this.chunksSent = 0;
                this.chunksPlayed = 0;
                this.output.onmessage = (e: MessageEvent<PlaybackReport>) => {
                    // Reports that waited while this thread was busy say less was played than
                    // really was, so they make it render less, never more
                    this.chunksPlayed = e.data.played;
                    this.underruns = e.data.underruns;
                    this.renderAndReport();
                };
                this.renderAndReport();
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

            case "play": {
                this.playSong();
                break;
            }

            case "pause": {
                this.pauseSong();
                break;
            }

            case "toggle": {
                if (this.sequencer.paused) {
                    this.playSong();
                } else {
                    this.pauseSong();
                }
                break;
            }

            case "seekBy": {
                this.sequencer.currentTime += command.seconds;
                break;
            }

            case "patch": {
                this.applyPatch(command.sessionId, command.patch);
                return;
            }

            case "closeBank": {
                this.closeBank(command.sessionId);
                return;
            }

            case "releaseSamples": {
                // The session may have closed since
                this.mirrors
                    .get(command.sessionId)
                    ?.releaseSamples(command.ids);
                return;
            }

            case "copyToClipboard": {
                const mirror = this.getMirror(command.sessionId);
                // Shared where it can be: edits and conversions give a sample new data arrays
                // and never change the old ones, so what is kept here stays as it was copied
                this.clipboardData = new Map(
                    command.ids.map((id) => {
                        const sample = mirror.getSample(id);
                        if (!sample) {
                            throw new Error(`No sample ${id} to copy.`);
                        }
                        return [id, shareOwnStoredData(sample.getStoredData())];
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

    /**
     * Logs a failure and tells the editor, which shows it. A failed patch leaves the mirror
     * behind the editor, so what plays and what gets saved may differ from what is shown.
     */
    private reportError(task: string, error: unknown) {
        logError(`The host failed to run ${task}.`, error);
        this.send({
            type: "hostError",
            message: error instanceof Error ? error.message : String(error)
        });
    }

    private renderAndReport() {
        try {
            this.render();
            this.isRenderFailing = false;
        } catch (error) {
            if (!this.isRenderFailing) {
                this.isRenderFailing = true;
                this.reportError("render", error);
            }
        }
    }

    /**
     * The queue a message waits in: a bank being written waits with its messages (see write).
     * A bank that copies from it (or from a clipboard copy that waits) waits in the same queue
     * from then on, so the copy gets the data its editor saw and its own messages stay in order.
     * What the keyboard plays changes no data, so it does not wait.
     */
    private getHold(command: HostCommand) {
        if (
            !("sessionId" in command) ||
            command.type === "attach" ||
            command.type === "previewTarget"
        ) {
            return undefined;
        }
        const own = this.heldCommands.get(command.sessionId);
        if (own) {
            return own;
        }
        let sources = new Array<HostCommand[] | undefined>();
        if (command.type === "patch") {
            sources = Array.from(command.patch.sampleCopies.values(), (ref) =>
                ref.from === "clipboard"
                    ? this.clipboardHold
                    : this.heldCommands.get(ref.sessionId)
            );
        } else if (command.type === "copyToClipboard") {
            sources = [this.clipboardHold];
        }
        const source = sources.find((queue) => queue !== undefined);
        if (source) {
            this.heldCommands.set(command.sessionId, source);
        }
        return source;
    }

    private handle(command: HostCommand) {
        const held = this.getHold(command);
        if (held) {
            held.push(command);
            if (command.type === "copyToClipboard") {
                this.clipboardHold = held;
            }
            return;
        }
        try {
            this.handleCommand(command);
        } catch (error) {
            this.reportError(command.type, error);
        }
    }

    /**
     * Restores what the host on the other thread handed off. A mirror that cannot be rebuilt
     * is reported and its session fails, like a bank that could not open.
     */
    private takeOver(handoff: HostHandoff) {
        for (const [sessionId, state] of handoff.mirrors) {
            try {
                this.mirrors.set(sessionId, BankMirror.fromState(state));
            } catch (error) {
                this.failedSessions.add(sessionId);
                this.reportError("handoff", error);
            }
        }
        for (const sessionId of handoff.failedSessions) {
            this.failedSessions.add(sessionId);
        }
        for (const [sessionId, snapshots] of handoff.snapshots) {
            this.snapshots.set(sessionId, new Map(snapshots));
        }
        this.nextSnapshot = handoff.nextSnapshot;
        this.clipboardData = new Map(handoff.clipboardData);
        if (
            handoff.attachedSession !== undefined &&
            this.mirrors.has(handoff.attachedSession)
        ) {
            this.attach(handoff.attachedSession);
        }
        this.previewTarget = handoff.previewTarget;
        const { song } = handoff;
        if (song) {
            this.sequencer.loadNewSongList([
                BasicMIDI.fromArrayBuffer(song.file.slice(0), song.name)
            ]);
            this.song = { file: song.file, name: song.name };
            this.playSong();
            this.sequencer.currentTime = song.time;
            if (song.isPaused) {
                this.pauseSong();
            }
        }
        this.applyPreviewTarget();
    }

    /**
     * Waits for the running requests (a save can take a while), then sends everything to the
     * connection and stops. The sample data is transferred, so nothing here may run afterward.
     */
    private async handOff() {
        while (this.running.size > 0) {
            await Promise.all(this.running);
        }
        const song = this.song;
        const state: HostHandoff = {
            mirrors: new Map(
                Array.from(this.mirrors, ([id, mirror]) => [
                    id,
                    mirror.exportState()
                ])
            ),
            failedSessions: [...this.failedSessions],
            attachedSession: this.attachedSession,
            previewTarget: this.previewTarget,
            clipboardData: this.clipboardData,
            snapshots: this.snapshots,
            nextSnapshot: this.nextSnapshot,
            settings: this.settings,
            currentTime: this.processor.currentTime,
            song: song
                ? {
                      file: song.file,
                      name: song.name,
                      time: this.sequencer.currentTime,
                      isPaused: this.sequencer.paused
                  }
                : undefined
        };
        if (this.output) {
            this.output.onmessage = null;
            this.output.close();
            this.output = undefined;
        }
        this.port.onmessage = null;
        const event: HandoffEvent = { type: "handOff", state };
        this.port.postMessage(event, getHandoffTransfer(state));
    }

    /**
     * The mirror of a session, for tests that look at what the synthesizer plays.
     */
    public getMirrorOf(sessionId: number) {
        return this.getMirror(sessionId);
    }
}
