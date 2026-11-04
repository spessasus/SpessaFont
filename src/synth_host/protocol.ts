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
import type { WriteFormat } from "../core_backend/persistence.ts";
import type { MirrorIds, MirrorTarget } from "./bank_mirror.ts";

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
 * A sample whose data the mirror copies from a sample of a session's mirror.
 */
export interface SampleCopyRef {
    readonly sessionId: number;
    readonly id: number;
}

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
 * What a conversion changed. The data before and after stays in the host, as two snapshots.
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
     * Undefined when the conversion or the write failed, with the reason in `error`.
     */
    readonly binary: ArrayBuffer | undefined;
    /**
     * Undefined when the conversion changed nothing. A conversion that failed halfway reports
     * what it changed already, so the editor can follow.
     */
    readonly conversion: ConversionReport | undefined;
    readonly error: string | undefined;
}

/**
 * What each request is answered with.
 */
export interface HostRequestResults {
    readAudio: Float32Array;
    readStoredData: SampleStoredData;
    write: WriteResult;
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
          type: "write";
          requestId: number;
          sessionId: number;
          options: WriteOptions;
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
    | { type: "loadSong"; file: ArrayBuffer; name: string }
    | { type: "play" }
    | { type: "pause" }
    | { type: "toggle" }
    | { type: "seekBy"; seconds: number }
    | {
          type: "openBank";
          sessionId: number;
          file: ArrayBuffer;
          ids: MirrorIds;
      }
    | { type: "patch"; sessionId: number; patch: PatchMessage }
    | { type: "closeBank"; sessionId: number }
    | { type: "attach"; sessionId: number }
    | {
          type: "previewTarget";
          sessionId: number;
          target: MirrorTarget | undefined;
      };

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
