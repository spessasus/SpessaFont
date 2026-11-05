import type {
    InterpolationType,
    SampleStoredData,
    SF2VersionTag,
    SoundBankInfoData,
    SynthesizerEventCallback
} from "spessasynth_core";
import type { ViewDiff } from "../core_backend/view_diff.ts";
import type { EngineStatus } from "../core_backend/engine_status.ts";
import type { KeyboardChannelValues } from "../core_backend/keyboard_channel_store.ts";
import type { WriteFailure, WriteFormat } from "../core_backend/persistence.ts";
import type { MirrorIds, MirrorState, MirrorTarget } from "./bank_mirror.ts";

/*
 * The messages between the editor and the synthesizer host. They are plain, structured-cloneable
 * data, so the host can run in a Worker or on the main thread behind a MessageChannel. Bank data
 * goes by the editor's ids, never by object.
 */

/**
 * The synthesizer settings the host applies.
 */
export interface HostSettings {
    interpolation: InterpolationType;
    velocitySenseDepth: number;
    velocitySenseOffset: number;
    reverbLevel: number;
    chorusLevel: number;
    delayLevel: number;
    voiceCap: number;
}

/**
 * Where a pasted sample's data comes from: a sample of a session's mirror (a duplicate, a
 * drop on a tab), or the data the host kept when the sample was copied (a paste).
 */
export type SampleCopyRef =
    | {
          readonly from: "session";
          readonly sessionId: number;
          readonly id: number;
      }
    | { readonly from: "clipboard"; readonly id: number };

/**
 * One commit of an editor's bank, as `MirrorSync` sends it.
 */
export interface PatchMessage {
    readonly views: ViewDiff;
    readonly info: SoundBankInfoData | undefined;
    readonly sampleData: ReadonlyMap<number, SampleStoredData>;
    readonly sampleCopies: ReadonlyMap<number, SampleCopyRef>;
    /**
     * Samples whose data comes back from a snapshot the host keeps (an undone conversion), by
     * id, with the snapshot's id.
     */
    readonly sampleRestores: ReadonlyMap<number, number>;
}

export interface WriteOptions {
    format: WriteFormat;
    /**
     * Converts the samples first: "pcm" decodes compressed samples (an explicit SF2 save),
     * "compressed" compresses them (SF3).
     */
    convert: "pcm" | "compressed" | undefined;
    software: string;
}

export interface SampleState {
    readonly sampleRate: number;
    readonly loopStart: number;
    readonly loopEnd: number;
    readonly form: SampleStoredData["form"];
    readonly length: number;
}

/**
 * What a conversion changed, for the editor to record. The host writes the converted bank, then
 * puts the samples back as they were, so the mirror changes only through the editor's patches.
 * The data before and after stays in the host, as two snapshots of the session.
 */
export interface ConversionReport {
    readonly samples: readonly {
        readonly id: number;
        readonly before: SampleState;
        readonly after: SampleState;
    }[];
    readonly beforeSnapshot: number;
    readonly afterSnapshot: number;
    readonly versionBefore: SF2VersionTag;
    readonly versionAfter: SF2VersionTag;
}

export interface WriteResult {
    /**
     * Undefined when the conversion or the write failed, with the reason in `error`. Nothing
     * changed in the mirror then.
     */
    readonly binary: ArrayBuffer | undefined;
    /**
     * Undefined when the conversion changed nothing or the save failed.
     */
    readonly conversion: ConversionReport | undefined;
    readonly error: string | undefined;
    readonly failure: WriteFailure | undefined;
    /**
     * Whether the written bank has compressed samples, which a .sf2 file must not get.
     */
    readonly hasCompressedSamples: boolean;
}

/**
 * What each request is answered with.
 */
export interface HostRequestResults {
    /**
     * A copy, which the editor may change.
     */
    readAudio: Float32Array;
    /**
     * A copy of the sample's own bytes.
     */
    readStoredData: SampleStoredData;
    /**
     * Answered once the mirror is loaded, or a failure when it could not be.
     */
    openBank: undefined;
    readSampleLengths: number[];
    write: WriteResult;
    loadSong: undefined;
}

/**
 * A request expects an answer with the same `requestId`.
 */
export type HostRequest =
    | {
          type: "readAudio";
          requestId: number;
          sessionId: number;
          id: number;
      }
    | {
          type: "readStoredData";
          requestId: number;
          sessionId: number;
          id: number;
      }
    | {
          type: "openBank";
          requestId: number;
          sessionId: number;
          file: ArrayBuffer;
          ids: MirrorIds;
      }
    | {
          /**
           * The lengths of the mirror's samples, which decodes the ones the editor's bank cannot
           * tell the length of.
           */
          type: "readSampleLengths";
          requestId: number;
          sessionId: number;
          ids: number[];
      }
    | {
          type: "write";
          requestId: number;
          sessionId: number;
          options: WriteOptions;
      }
    | {
          /**
           * Parses the MIDI file and plays it, failing when the file is broken.
           */
          type: "loadSong";
          requestId: number;
          file: ArrayBuffer;
          name: string;
      };

export type HostCommand =
    | HostRequest
    | {
          type: "connectOutput";
          /**
           * The playback worklet's end of a channel. It reports how many chunks it has queued,
           * the host answers with rendered chunks.
           */
          port: MessagePort;
      }
    | { type: "midi"; data: number[] }
    | { type: "pitchWheel"; channel: number; value: number }
    | { type: "channelPressure"; channel: number; value: number }
    | { type: "stopAll"; force: boolean }
    | { type: "reset" }
    | { type: "settings"; settings: HostSettings }
    | { type: "play" }
    | { type: "pause" }
    | { type: "toggle" }
    | { type: "seekBy"; seconds: number }
    | { type: "patch"; sessionId: number; patch: PatchMessage }
    /**
     * Waits for a write of the bank that is running, like every other message for it.
     */
    | { type: "closeBank"; sessionId: number }
    /**
     * Drops removed samples that can never come back, as nothing in the editor refers to
     * them any more.
     */
    | { type: "releaseSamples"; sessionId: number; ids: number[] }
    /**
     * Keeps a copy of the samples' data for pasting, so edits made after copying (or an undo
     * that removes them) do not reach the clipboard. Replaces what was kept before.
     */
    | { type: "copyToClipboard"; sessionId: number; ids: number[] }
    | { type: "attach"; sessionId: number }
    | {
          type: "previewTarget";
          sessionId: number;
          target: MirrorTarget | undefined;
      }
    /**
     * Stops the host once its running requests are done and answers with a `HandoffEvent`.
     * Sent by the connection when the host moves to the other thread.
     */
    | { type: "handOff" };

/**
 * Everything a host keeps, so another host (on the other thread) can take over. Sample data is
 * transferred, so the host that handed it off stops.
 */
export interface HostHandoff {
    readonly mirrors: ReadonlyMap<number, MirrorState>;
    readonly failedSessions: readonly number[];
    readonly attachedSession: number | undefined;
    readonly previewTarget:
        { sessionId: number; target: MirrorTarget | undefined } | undefined;
    readonly clipboardData: ReadonlyMap<number, SampleStoredData>;
    readonly snapshots: ReadonlyMap<
        number,
        ReadonlyMap<number, ReadonlyMap<number, SampleStoredData>>
    >;
    readonly nextSnapshot: number;
    readonly settings: HostSettings;
    readonly currentTime: number;
    readonly song:
        | {
              readonly file: ArrayBuffer;
              readonly name: string;
              readonly time: number;
              readonly isPaused: boolean;
          }
        | undefined;
}

/**
 * The host's answer to "handOff", which only the connection sees, never the client.
 */
export interface HandoffEvent {
    type: "handOff";
    state: HostHandoff;
}

/**
 * The buffers to transfer with a handoff, each once, as samples share their file's buffer.
 */
export function getHandoffTransfer(state: HostHandoff) {
    const buffers = new Set<ArrayBuffer>();
    const add = (stored: SampleStoredData) => {
        const { buffer } = stored.data;
        if (buffer instanceof ArrayBuffer) {
            buffers.add(buffer);
        }
    };
    for (const mirror of state.mirrors.values()) {
        for (const stored of mirror.patch.sampleData.values()) {
            add(stored);
        }
    }
    for (const stored of state.clipboardData.values()) {
        add(stored);
    }
    for (const session of state.snapshots.values()) {
        for (const snapshot of session.values()) {
            for (const stored of snapshot.values()) {
                add(stored);
            }
        }
    }
    if (state.song) {
        buffers.add(state.song.file);
    }
    return [...buffers];
}

/**
 * The synth events the editor uses. The others carry core objects, which cannot be sent.
 */
export type ForwardedSynthEvent = Extract<
    SynthesizerEventCallback,
    { type: "noteOn" | "noteOff" | "stopAll" | "reset" }
>;

export type HostAnswer =
    | { type: "answer"; requestId: number; value: unknown }
    | { type: "failure"; requestId: number; message: string }
    | { type: "progress"; requestId: number; value: number };

export type HostEvent =
    | HostAnswer
    /**
     * A command failed in the host, which keeps running.
     */
    | { type: "hostError"; message: string }
    /**
     * The Worker failed outside the host's own error handling, so the answers to pending
     * requests may never come. Sent by the port, not by the host.
     */
    | { type: "hostFailed"; message: string }
    | { type: "events"; events: ForwardedSynthEvent[] }
    | { type: "keyboardChannel"; values: KeyboardChannelValues }
    | { type: "status"; status: EngineStatus };

/**
 * The part of a `MessagePort` (or a Worker, or the Worker's global) both sides use.
 */
export interface HostPort {
    postMessage(message: unknown, transfer: Transferable[]): void;
    onmessage: ((event: MessageEvent) => void) | null;
}
