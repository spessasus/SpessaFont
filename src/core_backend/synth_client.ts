import type { SampleStoredData } from "spessasynth_core";
import type { MirrorIds, MirrorTarget } from "../synth_host/bank_mirror.ts";
import type {
    ForwardedSynthEvent,
    HostCommand,
    HostEvent,
    HostPort,
    HostRequest,
    HostRequestResults,
    HostSettings,
    PatchMessage,
    WriteOptions
} from "../synth_host/protocol.ts";
import { EngineStatusStore } from "./engine_status.ts";
import { KeyboardChannelStore } from "./keyboard_channel_store.ts";
import { ListenerSet } from "./listener_set.ts";
import { logWarn } from "../utils/core_utils.ts";

interface PendingRequest {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    onProgress?: (value: number) => void;
}

/**
 * The editor's side of the synthesizer host: it sends commands, turns requests into promises
 * and keeps what the host reports (synth events, the keyboard channel, the status) in stores.
 * It does not care whether the host runs in a Worker or on this thread.
 */
export class SynthClient {
    private readonly port: HostPort;
    private nextRequest = 1;
    private readonly pending = new Map<number, PendingRequest>();
    /**
     * The zones, generators and modulators of each open bank, by session.
     */
    private readonly bankSizes = new Map<number, number>();
    private readonly onBankSizeChange: ((total: number) => void) | undefined;
    /**
     * Note on and off, stop all and reset events of the synthesizer, one by one.
     */
    public readonly synthEvents = new ListenerSet<ForwardedSynthEvent>();
    /**
     * Voice count and sequencer state, about 10 times a second.
     */
    public readonly status = new EngineStatusStore();
    /**
     * The keyboard channel's controllers, pitch wheel and pressure.
     */
    public readonly keyboardChannel = new KeyboardChannelStore();
    /**
     * Failures in the host, with their message. The UI shows them.
     */
    public readonly hostErrors = new ListenerSet<string>();

    /**
     * @param port the host's port
     * @param onBankSizeChange called with the open banks' total size when a bank opens (before
     * the host gets it) and when one closes
     */
    public constructor(
        port: HostPort,
        onBankSizeChange?: (total: number) => void
    ) {
        this.port = port;
        this.onBankSizeChange = onBankSizeChange;
        this.port.onmessage = (e: MessageEvent<HostEvent>) => {
            this.handle(e.data);
        };
    }

    private handle(event: HostEvent) {
        switch (event.type) {
            case "events": {
                for (const e of event.events) {
                    this.synthEvents.emit(e);
                }
                return;
            }

            case "keyboardChannel": {
                this.keyboardChannel.update(event.values);
                return;
            }

            case "status": {
                const before = this.status.getSnapshot().underruns;
                this.status.update(event.status);
                if (event.status.underruns > before) {
                    logWarn(`Audio dropouts so far: ${event.status.underruns}`);
                }
                return;
            }

            case "progress": {
                this.pending.get(event.requestId)?.onProgress?.(event.value);
                return;
            }

            case "answer": {
                this.pending.get(event.requestId)?.resolve(event.value);
                this.pending.delete(event.requestId);
                return;
            }

            case "failure": {
                this.pending
                    .get(event.requestId)
                    ?.reject(new Error(event.message));
                this.pending.delete(event.requestId);
                return;
            }

            case "hostError": {
                this.hostErrors.emit(event.message);
                return;
            }

            case "hostFailed": {
                // Nothing may answer them any more, so a save or a read does not wait forever
                for (const request of this.pending.values()) {
                    request.reject(new Error(event.message));
                }
                this.pending.clear();
                this.hostErrors.emit(event.message);
            }
        }
    }

    private request<R extends HostRequest>(
        request: R,
        onProgress?: (value: number) => void,
        transfer: Transferable[] = []
    ) {
        return new Promise<HostRequestResults[R["type"]]>((resolve, reject) => {
            this.pending.set(request.requestId, {
                // The host answers each request type with its result type
                resolve: (value) =>
                    resolve(value as HostRequestResults[R["type"]]),
                reject,
                onProgress
            });
            this.send(request, transfer);
        });
    }

    private reportBankSize() {
        let total = 0;
        for (const size of this.bankSizes.values()) {
            total += size;
        }
        this.onBankSizeChange?.(total);
    }

    public send(command: HostCommand, transfer: Transferable[] = []) {
        this.port.postMessage(command, transfer);
    }

    public midi(data: number[] | Uint8Array) {
        this.send({ type: "midi", data: Array.from(data) });
    }

    public applySettings(settings: HostSettings) {
        this.send({ type: "settings", settings });
    }

    /**
     * Gives the host the bank's file, which it loads with the sample data. The buffer moves to
     * the host, the editor's bank does not use it after loading. Resolves once the host has
     * loaded it, and rejects when it could not.
     * @param size the bank's zones, generators and modulators
     */
    public openBank(
        sessionId: number,
        file: ArrayBuffer,
        ids: MirrorIds,
        size: number
    ) {
        this.bankSizes.set(sessionId, size);
        this.reportBankSize();
        return this.request(
            {
                type: "openBank",
                requestId: this.nextRequest++,
                sessionId,
                file,
                ids
            },
            undefined,
            [file]
        );
    }

    public patchBank(sessionId: number, patch: PatchMessage) {
        // The sample data is a copy made for the mirror, so it moves instead of being copied again
        const transfer = Array.from(
            patch.sampleData.values(),
            (stored) => stored.data.buffer
        );
        this.send({ type: "patch", sessionId, patch }, transfer);
    }

    public closeBank(sessionId: number) {
        this.send({ type: "closeBank", sessionId });
        if (this.bankSizes.delete(sessionId)) {
            this.reportBankSize();
        }
    }

    public copyToClipboard(sessionId: number, ids: number[]) {
        this.send({ type: "copyToClipboard", sessionId, ids });
    }

    public attach(sessionId: number) {
        this.send({ type: "attach", sessionId });
    }

    public setPreviewTarget(
        sessionId: number,
        target: MirrorTarget | undefined
    ) {
        this.send({ type: "previewTarget", sessionId, target });
    }

    public readAudio(sessionId: number, id: number) {
        return this.request({
            type: "readAudio",
            requestId: this.nextRequest++,
            sessionId,
            id
        });
    }

    public readStoredData(
        sessionId: number,
        id: number
    ): Promise<SampleStoredData> {
        return this.request({
            type: "readStoredData",
            requestId: this.nextRequest++,
            sessionId,
            id
        });
    }

    /**
     * Plays a MIDI file, resolving once the host parsed it. The buffer moves to the host.
     */
    public loadSong(file: ArrayBuffer, name: string) {
        return this.request(
            {
                type: "loadSong",
                requestId: this.nextRequest++,
                file,
                name
            },
            undefined,
            [file]
        );
    }

    public readSampleLengths(sessionId: number, ids: number[]) {
        return this.request({
            type: "readSampleLengths",
            requestId: this.nextRequest++,
            sessionId,
            ids
        });
    }

    public write(
        sessionId: number,
        options: WriteOptions,
        onProgress?: (value: number) => void
    ) {
        return this.request(
            {
                type: "write",
                requestId: this.nextRequest++,
                sessionId,
                options
            },
            onProgress
        );
    }
}
